import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 's_image.dart';

/// Full-screen pictures: swipe sideways between them, pinch to zoom, and drag down (while not zoomed)
/// to leave: the picture shrinks and rounds off while the backdrop fades, as when leaving an offer.
class SImageViewer extends StatefulWidget {
  final List<String> images;
  final int initialIndex;

  const SImageViewer({
    super.key,
    required this.images,
    this.initialIndex = 0,
  });

  static void show(
    BuildContext context, {
    required List<String> images,
    int initialIndex = 0,
  }) {
    if (images.isEmpty) return;
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierDismissible: true,
        pageBuilder: (ctx, anim, _) => FadeTransition(
          opacity: anim,
          child: SImageViewer(
            images: images,
            initialIndex: initialIndex,
          ),
        ),
      ),
    );
  }

  @override
  State<SImageViewer> createState() => _SImageViewerState();
}

class _SImageViewerState extends State<SImageViewer> with SingleTickerProviderStateMixin {
  // How far the finger drags down before the viewer closes.
  static const double _leaveAt = 110;

  late final PageController _controller;
  late final AnimationController _spring;
  late int _currentIndex;

  bool _zoomed = false;
  int _pointers = 0;
  Offset? _start;
  bool _dragging = false;
  bool _leaving = false;
  double _drag = 0;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _controller = PageController(initialPage: widget.initialIndex);
    _spring = AnimationController(vsync: this, duration: const Duration(milliseconds: 220));
  }

  @override
  void dispose() {
    _controller.dispose();
    _spring.dispose();
    super.dispose();
  }

  void _down(PointerDownEvent e) {
    _pointers++;
    if (_pointers == 1) {
      _start = e.position;
      _dragging = false;
      _spring.stop();
    } else {
      // A second finger is a pinch: the drag is over.
      _start = null;
      if (_dragging) _release(leave: false);
    }
  }

  void _move(PointerMoveEvent e) {
    final start = _start;
    if (start == null || _pointers != 1 || _zoomed || _leaving) return;
    final d = e.position - start;
    if (!_dragging) {
      if (d.dy > 12 && d.dy > d.dx.abs() * 1.5) {
        _dragging = true;
      } else if (d.dx.abs() > 12 || d.dy < -12) {
        _start = null;
        return;
      }
    }
    if (_dragging) setState(() => _drag = d.dy < 0 ? 0 : d.dy);
  }

  void _up(PointerEvent e) {
    _pointers = (_pointers - 1).clamp(0, 10);
    if (_pointers == 0 && _dragging) _release(leave: _drag >= _leaveAt);
    if (_pointers == 0) _start = null;
  }

  void _release({required bool leave}) {
    _dragging = false;
    if (leave) {
      _leaving = true;
      Navigator.of(context).pop();
      return;
    }
    final from = _drag;
    _spring.reset();
    void tick() {
      if (!mounted) return;
      setState(() => _drag = from * (1 - Curves.easeOutCubic.transform(_spring.value)));
    }

    _spring.addListener(tick);
    _spring.forward().whenComplete(() => _spring.removeListener(tick));
  }

  @override
  Widget build(BuildContext context) {
    final t = (_drag / _leaveAt).clamp(0.0, 1.0);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Listener(
        onPointerDown: _down,
        onPointerMove: _move,
        onPointerUp: _up,
        onPointerCancel: _up,
        child: Stack(
          children: [
            Positioned.fill(
              child: ColoredBox(color: Colors.black.withValues(alpha: 0.95 * (1 - t))),
            ),
            SafeArea(
              child: Stack(
                children: [
                  Transform.scale(
                    scale: 1 - 0.1 * t,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(32 * t),
                      child: PageView.builder(
                        controller: _controller,
                        itemCount: widget.images.length,
                        onPageChanged: (i) => setState(() => _currentIndex = i),
                        itemBuilder: (context, index) => _ZoomPage(
                          url: widget.images[index],
                          onZoom: (zoomed) {
                            if (zoomed != _zoomed) setState(() => _zoomed = zoomed);
                          },
                        ),
                      ),
                    ),
                  ),
                  Opacity(
                    opacity: 1 - t,
                    child: Stack(
                      children: [
                        Positioned(
                          top: 8,
                          left: 16,
                          right: 16,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              if (widget.images.length > 1)
                                Text(
                                  '${_currentIndex + 1} / ${widget.images.length}',
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                )
                              else
                                const SizedBox.shrink(),
                              IconButton(
                                icon: const Icon(LucideIcons.x, color: Colors.white),
                                onPressed: () => Navigator.of(context).pop(),
                              ),
                            ],
                          ),
                        ),
                        if (widget.images.length > 1) ...[
                          if (_currentIndex > 0)
                            Positioned(
                              left: 12,
                              top: 0,
                              bottom: 0,
                              child: Center(
                                child: IconButton(
                                  icon: const Icon(LucideIcons.chevronLeft, color: Colors.white70, size: 32),
                                  onPressed: () => _controller.previousPage(
                                    duration: const Duration(milliseconds: 250),
                                    curve: Curves.easeOut,
                                  ),
                                ),
                              ),
                            ),
                          if (_currentIndex < widget.images.length - 1)
                            Positioned(
                              right: 12,
                              top: 0,
                              bottom: 0,
                              child: Center(
                                child: IconButton(
                                  icon: const Icon(LucideIcons.chevronRight, color: Colors.white70, size: 32),
                                  onPressed: () => _controller.nextPage(
                                    duration: const Duration(milliseconds: 250),
                                    curve: Curves.easeOut,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One picture with its own zoom; tells whether it is zoomed, so the page can leave the drag-down to it alone.
class _ZoomPage extends StatefulWidget {
  final String url;
  final ValueChanged<bool> onZoom;

  const _ZoomPage({required this.url, required this.onZoom});

  @override
  State<_ZoomPage> createState() => _ZoomPageState();
}

class _ZoomPageState extends State<_ZoomPage> {
  final TransformationController _transform = TransformationController();
  bool _zoomed = false;

  @override
  void initState() {
    super.initState();
    _transform.addListener(() {
      final zoomed = _transform.value.getMaxScaleOnAxis() > 1.02;
      if (zoomed != _zoomed) {
        _zoomed = zoomed;
        widget.onZoom(zoomed);
      }
    });
  }

  @override
  void dispose() {
    _transform.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return InteractiveViewer(
      transformationController: _transform,
      minScale: 1.0,
      maxScale: 4.0,
      child: Center(
        child: SImage(
          url: widget.url,
          fit: BoxFit.contain,
          targetWidth: 1080,
        ),
      ),
    );
  }
}
