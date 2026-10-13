import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import '../design/colors.dart';

Directory? _b64CacheDir;
final Map<String, String> _diskPathCache = {};

Future<Directory> _getB64CacheDir() async {
  if (_b64CacheDir != null) return _b64CacheDir!;
  final temp = await getTemporaryDirectory();
  final dir = Directory(p.join(temp.path, 'salacope_b64'));
  if (!dir.existsSync()) {
    dir.createSync(recursive: true);
  }
  _b64CacheDir = dir;
  return dir;
}

String _computeCacheKey(String encoded) {
  if (encoded.length <= 64) return encoded.hashCode.abs().toString();
  return '${encoded.length}_${encoded.substring(0, 32).hashCode.abs()}_${encoded.substring(encoded.length - 20).hashCode.abs()}';
}

/// Helper executed inside a background Isolate to never block the main UI thread.
Future<String?> _decodeAndSaveInIsolate(String encoded, String dirPath) async {
  return await Isolate.run(() {
    try {
      final key = _computeCacheKey(encoded);
      final file = File(p.join(dirPath, '$key.jpg'));
      if (file.existsSync() && file.lengthSync() > 0) {
        return file.path;
      }
      final commaIndex = encoded.indexOf(',');
      final data = commaIndex != -1 ? encoded.substring(commaIndex + 1) : encoded;
      final bytes = base64Decode(data);
      file.writeAsBytesSync(bytes, flush: false);
      return file.path;
    } catch (_) {
      return null;
    }
  });
}

/// The server sends its own images as a path (`/api/img/l/<id>?v=…`): on a phone they live on the site.
String _absoluteUrl(String url) =>
    url.startsWith('/') ? 'https://salacope.online$url' : url;

/// Downscales common CDN URLs (e.g. Unsplash) at the network level to save mobile bandwidth.
String _optimizeNetworkUrl(String url, int targetWidth) {
  if (url.contains('images.unsplash.com')) {
    final uri = Uri.tryParse(url);
    if (uri != null) {
      final qp = Map<String, String>.from(uri.queryParameters);
      qp['w'] = '$targetWidth';
      qp['auto'] = 'format';
      qp['fit'] = 'crop';
      qp['q'] = '75';
      return uri.replace(queryParameters: qp).toString();
    }
  }
  return url;
}

class SImage extends StatefulWidget {
  final String? url;
  final double? width;
  final double? height;
  final int? targetWidth;
  final int? targetHeight;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final Widget? placeholder;
  final Widget? errorWidget;

  /// Called with width / height once the picture is decoded.
  final ValueChanged<double>? onAspect;

  const SImage({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.targetWidth,
    this.targetHeight,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.placeholder,
    this.errorWidget,
    this.onAspect,
  });

  @override
  State<SImage> createState() => _SImageState();
}

class _SImageState extends State<SImage> {
  String? _filePath;
  bool _isLoading = false;
  bool _hasError = false;

  int get _effectiveTargetWidth {
    if (widget.targetWidth != null) return widget.targetWidth!;
    if (widget.width != null) {
      return (widget.width! * 1.5).round().clamp(60, 480);
    }
    // Optimal default for phone grid cards: 320px (crisp, zero lag, minimal VRAM)
    return 320;
  }

  @override
  void initState() {
    super.initState();
    _resolveImage(isInitial: true);
  }

  @override
  void didUpdateWidget(SImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url) {
      _resolveImage(isInitial: false);
    }
  }

  void _resolveImage({required bool isInitial}) {
    final url = widget.url;
    if (url == null || url.isEmpty) {
      _filePath = null;
      _isLoading = false;
      _hasError = true;
      if (!isInitial) setState(() {});
      return;
    }

    if (url.startsWith('data:')) {
      final key = _computeCacheKey(url);
      final cached = _diskPathCache[key];
      if (cached != null) {
        _filePath = cached;
        _isLoading = false;
        _hasError = false;
        if (!isInitial) setState(() {});
        return;
      }

      _isLoading = true;
      _hasError = false;

      // Offload to background Isolate to guarantee 60/120 FPS scrolling
      () async {
        try {
          final dir = await _getB64CacheDir();
          final path = await _decodeAndSaveInIsolate(url, dir.path);

          if (path != null) {
            _diskPathCache[key] = path;
          }

          if (mounted && widget.url == url) {
            setState(() {
              _filePath = path;
              _isLoading = false;
              _hasError = path == null;
            });
          }
        } catch (_) {
          if (mounted && widget.url == url) {
            setState(() {
              _filePath = null;
              _isLoading = false;
              _hasError = true;
            });
          }
        }
      }();
    } else {
      _filePath = null;
      _isLoading = false;
      _hasError = false;
      if (!isInitial) setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final defaultPlaceholder = Container(
      width: widget.width,
      height: widget.height,
      color: colors.canvasSubtle,
    );

    final defaultError = Container(
      width: widget.width,
      height: widget.height,
      color: colors.canvasSubtle,
      child: Center(
        child: Icon(
          Icons.broken_image_outlined,
          size: 20,
          color: colors.gray400,
        ),
      ),
    );

    Widget imageContent;

    if (_hasError) {
      imageContent = widget.errorWidget ?? defaultError;
    } else if (_isLoading) {
      imageContent = widget.placeholder ?? defaultPlaceholder;
    } else if (_filePath != null) {
      // Direct native file stream decoded at downscaled thumbnail resolution
      final file = File(_filePath!);
      final image = Image.file(
        file,
        width: widget.width,
        height: widget.height,
        fit: widget.fit,
        cacheWidth: _effectiveTargetWidth,
        filterQuality: FilterQuality.low,
        gaplessPlayback: true,
        frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
          if (wasSynchronouslyLoaded || frame != null) {
            return child;
          }
          return widget.placeholder ?? defaultPlaceholder;
        },
        errorBuilder: (_, _, _) => widget.errorWidget ?? defaultError,
      );
      imageContent = widget.onAspect == null
          ? image
          : _AspectProbe(
              provider: ResizeImage.resizeIfNeeded(_effectiveTargetWidth, null, FileImage(file)),
              onAspect: widget.onAspect!,
              child: image,
            );
    } else if (widget.url != null &&
        (widget.url!.startsWith('http') || widget.url!.startsWith('/'))) {
      final targetPx = _effectiveTargetWidth;
      final optimizedUrl = _optimizeNetworkUrl(_absoluteUrl(widget.url!), targetPx);
      imageContent = CachedNetworkImage(
        imageUrl: optimizedUrl,
        cacheKey: '$optimizedUrl@$targetPx',
        width: widget.width,
        height: widget.height,
        fit: widget.fit,
        memCacheWidth: targetPx,
        maxWidthDiskCache: targetPx,
        filterQuality: FilterQuality.low,
        imageBuilder: widget.onAspect == null
            ? null
            : (context, provider) => _AspectProbe(
                  provider: provider,
                  onAspect: widget.onAspect!,
                  child: Image(
                    image: provider,
                    width: widget.width,
                    height: widget.height,
                    fit: widget.fit,
                    filterQuality: FilterQuality.low,
                  ),
                ),
        fadeInDuration: const Duration(milliseconds: 140),
        fadeOutDuration: Duration.zero,
        placeholder: (_, _) => widget.placeholder ?? defaultPlaceholder,
        errorWidget: (_, _, _) => widget.errorWidget ?? defaultError,
      );
    } else if (widget.url != null && widget.url!.isNotEmpty) {
      imageContent = Image.asset(
        widget.url!,
        width: widget.width,
        height: widget.height,
        fit: widget.fit,
        cacheWidth: _effectiveTargetWidth,
        filterQuality: FilterQuality.low,
        gaplessPlayback: true,
        errorBuilder: (_, _, _) => widget.errorWidget ?? defaultError,
      );
    } else {
      imageContent = widget.errorWidget ?? defaultError;
    }

    if (widget.borderRadius != null) {
      return ClipRRect(
        borderRadius: widget.borderRadius!,
        child: imageContent,
      );
    }

    return imageContent;
  }
}

/// Reports the shape (width / height) of the picture a provider decodes, then shows [child].
class _AspectProbe extends StatefulWidget {
  final ImageProvider provider;
  final ValueChanged<double> onAspect;
  final Widget child;

  const _AspectProbe({required this.provider, required this.onAspect, required this.child});

  @override
  State<_AspectProbe> createState() => _AspectProbeState();
}

class _AspectProbeState extends State<_AspectProbe> {
  ImageStream? _stream;
  late final ImageStreamListener _listener;

  @override
  void initState() {
    super.initState();
    _listener = ImageStreamListener((info, _) {
      final h = info.image.height;
      if (h > 0) {
        final aspect = info.image.width / h;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) widget.onAspect(aspect);
        });
      }
    });
    _stream = widget.provider.resolve(ImageConfiguration.empty)..addListener(_listener);
  }

  @override
  void dispose() {
    _stream?.removeListener(_listener);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
