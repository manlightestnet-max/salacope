import 'package:flutter/material.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/db/models/listing.dart';
import '../../../../core/ui/s_image.dart';
import '../../../../core/ui/s_image_viewer.dart';
import '../../data/catalog_api.dart';
import '../../domain/catalog_model.dart';

/// Every image of an offer in the shape of its category: swipe to move, a tap opens them full screen,
/// a row of thumbnails under the image when there are several. One image: just the cover.
class ListingGallery extends StatefulWidget {
  final Listing listing;
  final String? heroTag;

  /// Buttons laid over the image (heart, zoom); gets the images loaded so far and the one on screen.
  final Widget Function(List<String> images, int index)? overlayBuilder;

  /// A fixed height instead of the shape of the category (a tall cover would fill the screen).
  final double? height;

  /// The frame takes the real shape of the cover (never cropped), up to this height.
  final double? maxHeight;

  /// Tells the height the frame ends up with.
  final ValueChanged<double>? onHeight;

  /// Edge to edge: no rounded corners, no frame; the thumbnails keep a margin.
  final bool bleed;

  const ListingGallery({
    super.key,
    required this.listing,
    this.heroTag,
    this.overlayBuilder,
    this.height,
    this.maxHeight,
    this.onHeight,
    this.bleed = false,
  });

  @override
  State<ListingGallery> createState() => _ListingGalleryState();
}

class _ListingGalleryState extends State<ListingGallery> {
  static const double _thumb = 64;
  // Cards show a tiny version of the cover: the page starts from it, then goes sharp once the hero animation is over.
  static const int _lowRes = 240;
  static const int _sharpRes = 1080;

  final _pager = PageController();
  final _strip = ScrollController();
  List<String> _extra = const [];
  int _index = 0;
  double? _aspect;
  bool _sharp = false;
  Animation<double>? _route;

  Listing get _l => widget.listing;
  List<String> get _images => [_l.coverImage, ..._extra];
  int get _count {
    final expected = 1 + _l.galleryCount;
    return expected > _images.length ? expected : _images.length;
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_sharp || _route != null) return;
    final animation = ModalRoute.of(context)?.animation;
    if (animation == null || animation.isCompleted) {
      _sharp = true;
    } else {
      _route = animation..addStatusListener(_onRouteStatus);
    }
  }

  void _onRouteStatus(AnimationStatus status) {
    if (status != AnimationStatus.completed) return;
    _route?.removeStatusListener(_onRouteStatus);
    _route = null;
    // A beat after the landing, so the sharp decode never competes with the animation.
    Future.delayed(const Duration(milliseconds: 150), () {
      if (mounted) setState(() => _sharp = true);
    });
  }

  @override
  void didUpdateWidget(ListingGallery old) {
    super.didUpdateWidget(old);
    if (old.listing.id != _l.id ||
        old.listing.updatedAt != _l.updatedAt ||
        old.listing.galleryCount != _l.galleryCount) {
      _extra = const [];
      _load();
    }
  }

  @override
  void dispose() {
    _route?.removeStatusListener(_onRouteStatus);
    _pager.dispose();
    _strip.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (_l.galleryCount <= 0) return;
    final listing = _l;
    final extra = await fetchListingGallery(listing);
    if (!mounted || listing.id != _l.id) return;
    setState(() => _extra = extra);
  }

  void _setAspect(double a) {
    if (_aspect == null || (a - _aspect!).abs() > 0.01) setState(() => _aspect = a);
  }

  void _go(int i) {
    if (!_pager.hasClients) return;
    _pager.animateToPage(
      i,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  void _onPage(int i) {
    setState(() => _index = i);
    // The current thumbnail stays in view inside its own strip.
    if (_strip.hasClients) {
      final target = (i * (_thumb + 8) - (_strip.position.viewportDimension - _thumb) / 2)
          .clamp(0.0, _strip.position.maxScrollExtent);
      _strip.animateTo(
        target,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final images = _images;
    final count = _count;
    final ratio = CoverFormat.forCategory(_l.category).aspectRatio;

    final box = Container(
        decoration: BoxDecoration(
          borderRadius: widget.bleed ? null : BorderRadius.circular(SalacopeTokens.radiusLg),
          border: widget.bleed ? null : Border.all(color: colors.canvasBorder, width: 0.8),
          color: colors.canvasSubtle,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            PageView.builder(
              controller: _pager,
              itemCount: count,
              onPageChanged: _onPage,
              itemBuilder: (context, i) {
                if (i >= images.length) {
                  return ColoredBox(color: colors.canvasSubtle);
                }
                return GestureDetector(
                  onTap: () => SImageViewer.show(
                    context,
                    images: images,
                    initialIndex: i,
                  ),
                  // The small version stays under the sharp one: the sharp one fades in over it,
                  // so the frame is never empty while it loads.
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      SImage(
                        url: images[i],
                        fit: BoxFit.contain,
                        targetWidth: _lowRes,
                        onAspect: i == 0 ? _setAspect : null,
                      ),
                      if (_sharp)
                        SImage(
                          url: images[i],
                          fit: BoxFit.contain,
                          targetWidth: _sharpRes,
                          placeholder: const SizedBox.shrink(),
                          errorWidget: const SizedBox.shrink(),
                        ),
                    ],
                  ),
                );
              },
            ),
            if (count > 1)
              Positioned(
                left: 0,
                right: 0,
                bottom: 10,
                child: IgnorePointer(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (var i = 0; i < count; i++)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: i == _index ? 16 : 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: colors.canvas.withValues(alpha: i == _index ? 1 : 0.6),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            if (widget.overlayBuilder != null) widget.overlayBuilder!(images, _index),
          ],
        ),
      );

    Widget frame = widget.maxHeight != null
        ? LayoutBuilder(
            builder: (context, c) {
              final w = c.maxWidth;
              final h = (w / (_aspect ?? ratio)).clamp(w / 2.0, widget.maxHeight!).toDouble();
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) widget.onHeight?.call(h);
              });
              return AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                height: h,
                child: box,
              );
            },
          )
        : widget.height != null
            ? SizedBox(height: widget.height, child: box)
            : AspectRatio(aspectRatio: ratio, child: box);

    if (widget.heroTag != null) {
      frame = Hero(
        tag: widget.heroTag!,
        // The flight shows the card's own cover, already decoded, instead of this frame (still empty while its picture loads).
        flightShuttleBuilder: (context, animation, direction, fromContext, toContext) {
          final other = (direction == HeroFlightDirection.push ? fromContext : toContext).widget as Hero;
          return Material(type: MaterialType.transparency, child: other.child);
        },
        child: frame,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        frame,
        if (count > 1) ...[
          const SizedBox(height: 8),
          SizedBox(
            height: _thumb,
            child: ListView.separated(
              controller: _strip,
              scrollDirection: Axis.horizontal,
              padding: widget.bleed ? const EdgeInsets.symmetric(horizontal: 16) : null,
              itemCount: count,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final src = i < images.length ? images[i] : null;
                final active = i == _index;
                return GestureDetector(
                  onTap: src == null ? null : () => _go(i),
                  child: AnimatedOpacity(
                    duration: const Duration(milliseconds: 200),
                    opacity: active ? 1 : 0.7,
                    child: Container(
                      width: _thumb,
                      height: _thumb,
                      decoration: BoxDecoration(
                        color: colors.canvasSubtle,
                        borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                        border: Border.all(
                          color: active ? colors.textPrimary : Colors.transparent,
                          width: 2,
                        ),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: src == null
                          ? null
                          : SImage(url: src, fit: BoxFit.cover, targetWidth: 120),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}
