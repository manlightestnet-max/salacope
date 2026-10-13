import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/design/colors.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/ui/s_image.dart';
import '../../data/catalog_api.dart';

/// Banner of the storefront, like the web one: the advertising slots (up to three) an administrator configured,
/// each opening its link. Swipe to move; it advances by itself and pauses while touched.
class ShopBanner extends StatefulWidget {
  const ShopBanner({super.key});

  @override
  State<ShopBanner> createState() => _ShopBannerState();
}

class _ShopBannerState extends State<ShopBanner> {
  // The stored image is 1200x450 (8:3): same shape on every screen, so nothing is cropped on a phone.
  static const double _shape = 8 / 3;

  final _pager = PageController();
  Timer? _timer;
  List<ShopBannerSlot>? _banners = cachedBanners;
  bool _paused = false;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    fetchBanners().then((b) {
      if (mounted) setState(() => _banners = b);
    });
    _timer = Timer.periodic(const Duration(milliseconds: 5500), (_) => _advance());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pager.dispose();
    super.dispose();
  }

  void _advance() {
    final count = _banners?.length ?? 0;
    if (!mounted || _paused || count < 2 || !_pager.hasClients) return;
    if (MediaQuery.of(context).disableAnimations) return;
    _pager.animateToPage(
      (_index + 1) % count,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOut,
    );
  }

  void _open(ShopBannerSlot banner) {
    final link = banner.link.trim();
    if (link.startsWith('https://')) {
      launchUrl(Uri.parse(link), mode: LaunchMode.externalApplication);
    } else if (link.startsWith('/')) {
      context.push(link);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final banners = _banners;
    final radius = BorderRadius.circular(SalacopeTokens.radiusXl);

    if (banners == null) {
      return AspectRatio(
        aspectRatio: _shape,
        child: DecoratedBox(
          decoration: BoxDecoration(color: colors.canvasSubtle, borderRadius: radius),
        ),
      );
    }
    if (banners.isEmpty) return const SizedBox.shrink();

    return Listener(
      onPointerDown: (_) => _paused = true,
      onPointerUp: (_) => _paused = false,
      onPointerCancel: (_) => _paused = false,
      child: AspectRatio(
        aspectRatio: _shape,
        child: Stack(
          children: [
            PageView.builder(
              controller: _pager,
              itemCount: banners.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (context, i) {
                final b = banners[i];
                return GestureDetector(
                  onTap: () => _open(b),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: radius,
                      color: colors.canvasSubtle,
                      border: Border.all(color: colors.canvasBorder, width: 0.8),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        SImage(url: b.image, fit: BoxFit.cover, targetWidth: 640),
                        if (b.title.isNotEmpty)
                          Positioned(
                            left: 8,
                            bottom: 8,
                            child: ConstrainedBox(
                              constraints: BoxConstraints(
                                maxWidth: MediaQuery.sizeOf(context).width * 0.7,
                              ),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: colors.canvas.withValues(alpha: 0.85),
                                  borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                                ),
                                child: Text(
                                  b.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: colors.textPrimary,
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
            if (banners.length > 1)
              Positioned(
                right: 12,
                bottom: 10,
                child: IgnorePointer(
                  child: Row(
                    children: [
                      for (var i = 0; i < banners.length; i++)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.only(left: 4),
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
          ],
        ),
      ),
    );
  }
}
