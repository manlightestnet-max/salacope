import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/listing.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/tokens.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/domain/orders.dart';
import 'package:salacope/core/lib/format.dart';
import 'package:salacope/core/ui/s_badge.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_dialog.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_image.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_segmented.dart';
import 'package:salacope/core/ui/s_toast.dart';
import 'package:salacope/features/listings/data/listings_api.dart';
import 'package:salacope/features/verification/presentation/widgets/verification_notice.dart';

class SellerListingsScreen extends StatefulWidget {
  const SellerListingsScreen({super.key});

  @override
  State<SellerListingsScreen> createState() => _SellerListingsScreenState();
}

class _SellerListingsScreenState extends State<SellerListingsScreen> {
  String _filter = 'all'; // all | published | draft

  bool _listingHasOrders(String listingId) {
    return db.orders.any((o) => o.listingId == listingId);
  }

  void _showListingActions(BuildContext context, Listing listing, int sales, int revenue) {
    final colors = context.colors;
    final published = listing.status == 'published';
    final hasOrders = _listingHasOrders(listing.id);

    showSSheet(
      context: context,
      title: listing.title,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: Icon(LucideIcons.pencil, color: colors.textPrimary, size: 20),
            title: const Text('Modifier l’offre'),
            onTap: () {
              Navigator.pop(context);
              context.push('/dashboard/offres/${listing.id}');
            },
          ),
          if (published)
            ListTile(
              leading: Icon(LucideIcons.eye, color: colors.textPrimary, size: 20),
              title: const Text('Voir dans le catalogue'),
              onTap: () {
                Navigator.pop(context);
                context.push('/produit/${listing.id}');
              },
            ),
          ListTile(
            leading: Icon(
              published ? LucideIcons.eyeOff : LucideIcons.globe,
              color: colors.textPrimary,
              size: 20,
            ),
            title: Text(published ? 'Dépublier' : 'Publier'),
            onTap: () async {
              Navigator.pop(context);
              try {
                final newStatus = published ? 'draft' : 'published';
                await listingsApi.setListingStatus(listing.id, newStatus);
                if (context.mounted) {
                  SToast.show(
                    context,
                    message: published ? 'Offre dépubliée' : 'Offre publiée',
                    variant: SToastVariant.success,
                  );
                  setState(() {});
                }
              } catch (e) {
                if (context.mounted) {
                  SToast.show(context, message: e.toString(), variant: SToastVariant.danger);
                }
              }
            },
          ),
          const Divider(height: 1),
          ListTile(
            leading: Icon(LucideIcons.trash2, color: colors.danger, size: 20),
            title: Text(
              'Supprimer',
              style: TextStyle(color: colors.danger),
            ),
            onTap: () {
              Navigator.pop(context);
              if (hasOrders) {
                showSConfirm(
                  context: context,
                  title: 'Cette offre a déjà été vendue',
                  description:
                      'Elle ne peut pas être supprimée car vos clients y ont encore accès. Dépubliez-la pour la retirer du catalogue.',
                  confirmLabel: 'Dépublier',
                  onConfirm: () async {
                    try {
                      await listingsApi.setListingStatus(listing.id, 'draft');
                      if (context.mounted) {
                        SToast.show(context, message: 'Offre dépubliée', variant: SToastVariant.success);
                        setState(() {});
                      }
                      return true;
                    } catch (e) {
                      if (context.mounted) {
                        SToast.show(context, message: e.toString(), variant: SToastVariant.danger);
                      }
                      return false;
                    }
                  },
                );
              } else {
                showSConfirm(
                  context: context,
                  title: 'Supprimer cette offre ?',
                  description:
                      'Elle sera retirée du catalogue et des favoris. Cette action est définitive.',
                  confirmLabel: 'Supprimer',
                  danger: true,
                  onConfirm: () async {
                    try {
                      await listingsApi.deleteListing(listing.id);
                      if (context.mounted) {
                        SToast.show(context, message: 'Offre supprimée', variant: SToastVariant.success);
                        setState(() {});
                      }
                      return true;
                    } catch (e) {
                      if (context.mounted) {
                        SToast.show(context, message: e.toString(), variant: SToastVariant.danger);
                      }
                      return false;
                    }
                  },
                );
              }
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final user = db.user;
    final allListings = db.listings;
    final allOrders = db.orders;

    if (user == null || user.merchant == null) {
      return Scaffold(
        backgroundColor: colors.canvas,
        appBar: AppBar(
          backgroundColor: colors.canvas,
          title: const Text('Offres'),
          leading: const BackButton(),
        ),
        body: const Center(
          child: SEmptyState(
            title: 'Boutique requise',
            description: 'Vous devez avoir une boutique pour gérer vos offres.',
          ),
        ),
      );
    }

    final myListings = allListings.where((l) => l.sellerId == user.id).toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));

    final visible = myListings.where((l) {
      if (_filter == 'all') return true;
      return l.status == _filter;
    }).toList();

    final allCount = myListings.length;
    final publishedCount = myListings.where((l) => l.status == 'published').length;
    final draftCount = myListings.where((l) => l.status == 'draft').length;

    // Todo orders count for nav pill
    final todoCount = allOrders
        .where((o) => o.sellerId == user.id && sellerLanes.firstWhere((l) => l.lane == o.lane).todo)
        .length;

    return SPage(
      title: 'Offres',
      leading: const BackButton(),
      actions: [
        SButton(
          label: 'Nouvelle offre',
          variant: SButtonVariant.primary,
          size: SButtonSize.sm,
          pill: true,
          icon: const Icon(LucideIcons.plus, size: 14),
          onPressed: () => context.push('/dashboard/offres/nouvelle'),
        ),
      ],
      toolbar: PreferredSize(
        preferredSize: const Size.fromHeight(48),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              _NavPill(
                label: "Vue d'ensemble",
                onTap: () => context.push('/dashboard'),
              ),
              _NavPill(
                label: 'Ventes',
                badge: todoCount > 0 ? '$todoCount' : null,
                onTap: () => context.push('/dashboard/ventes'),
              ),
              _NavPill(
                label: 'Offres',
                active: true,
                onTap: () {},
              ),
              _NavPill(
                label: 'Clients',
                onTap: () => context.push('/dashboard/clients'),
              ),
              _NavPill(
                label: 'Paiements',
                onTap: () => context.push('/dashboard/paiements'),
              ),
              if (user.merchant?.kycStatus != 'approved')
                _NavPill(
                  label: 'Vérification',
                  badge: user.merchant?.kycStatus == 'pending' ? null : '!',
                  onTap: () => context.push('/dashboard/verification'),
                ),
            ],
          ),
        ),
      ),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (user.merchant != null) ...[
                  VerificationNotice(merchant: user.merchant!),
                  const SizedBox(height: 16),
                ],
                if (myListings.isEmpty)
                  SEmptyState(
                    title: 'Aucune offre',
                    description: 'Un fichier livré au paiement, ou un service livré dans un délai fixé.',
                    action: SButton(
                      label: 'Créer une offre',
                      variant: SButtonVariant.primary,
                      size: SButtonSize.md,
                      pill: true,
                      onPressed: () => context.push('/dashboard/offres/nouvelle'),
                    ),
                  )
                else
                  SPanel(
                    titleText: 'Vos offres',
                    count: visible.length,
                    actions: SSegmented<String>(
                      value: _filter,
                      options: [
                        SSegmentedOption(value: 'all', label: 'Toutes ($allCount)'),
                        SSegmentedOption(value: 'published', label: 'En ligne ($publishedCount)'),
                        SSegmentedOption(value: 'draft', label: 'Brouillons ($draftCount)'),
                      ],
                      onChanged: (v) => setState(() => _filter = v),
                    ),
                    child: visible.isEmpty
                        ? const SEmptyState(title: 'Aucune offre dans cette vue.')
                        : Column(
                            children: visible.map((listing) {
                              final ordersForListing = allOrders
                                  .where((o) => o.listingId == listing.id && o.status != 'cancelled')
                                  .toList();
                              final sales = ordersForListing.length;
                              final revenue = ordersForListing.fold<int>(0, (sum, o) => sum + o.amounts.net);
                              final published = listing.status == 'published';

                              return InkWell(
                                onTap: () => context.push('/dashboard/offres/${listing.id}'),
                                borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.center,
                                    children: [
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(SalacopeTokens.radiusMd),
                                        child: SizedBox(
                                          width: 48,
                                          height: 48,
                                          child: SImage(
                                            url: listing.coverImage,
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              listing.title,
                                              style: SalacopeTypography.bodyStrong.copyWith(
                                                color: colors.textPrimary,
                                                fontSize: 13,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${listing.kind == "service" ? "Service" : "Produit numérique"} · $sales vente${sales > 1 ? "s" : ""} · modifiée le ${formatDate(listing.updatedAt)}',
                                              style: SalacopeTypography.caption.copyWith(
                                                color: colors.textMuted,
                                                fontSize: 11,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Row(
                                              children: [
                                                SBadge(
                                                  label: published ? 'En ligne' : 'Brouillon',
                                                  variant: published ? SBadgeVariant.success : SBadgeVariant.neutral,
                                                ),
                                                if (revenue > 0) ...[
                                                  const SizedBox(width: 8),
                                                  Text(
                                                    '${formatXaf(revenue)} encaissés',
                                                    style: SalacopeTypography.caption.copyWith(
                                                      color: colors.textSecondary,
                                                      fontSize: 11,
                                                    ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            formatXaf(listing.priceXaf),
                                            style: SalacopeTypography.bodyStrong.copyWith(
                                              color: colors.textPrimary,
                                              fontSize: 13,
                                            ),
                                          ),
                                          IconButton(
                                            icon: Icon(LucideIcons.ellipsis, size: 18, color: colors.textMuted),
                                            onPressed: () => _showListingActions(context, listing, sales, revenue),
                                            tooltip: 'Actions',
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _NavPill extends StatelessWidget {
  final String label;
  final String? badge;
  final bool active;
  final VoidCallback onTap;

  const _NavPill({
    required this.label,
    this.badge,
    this.active = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: active ? colors.accent : colors.surface,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: active ? colors.accent : colors.canvasBorder,
              width: 0.8,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: active ? colors.onAccent : colors.textPrimary,
                  fontSize: 12.5,
                  fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
              if (badge != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: active ? colors.surface : colors.accent,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    badge!,
                    style: TextStyle(
                      color: active ? colors.textPrimary : colors.onAccent,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
