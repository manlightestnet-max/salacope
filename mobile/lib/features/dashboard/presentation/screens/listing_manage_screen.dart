import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:salacope/core/db/models/listing.dart';
import 'package:salacope/core/db/store.dart';
import 'package:salacope/core/design/colors.dart';
import 'package:salacope/core/design/typography.dart';
import 'package:salacope/core/ui/s_badge.dart';
import 'package:salacope/core/ui/s_button.dart';
import 'package:salacope/core/ui/s_dialog.dart';
import 'package:salacope/core/ui/s_empty_state.dart';
import 'package:salacope/core/ui/s_list.dart';
import 'package:salacope/core/ui/s_page.dart';
import 'package:salacope/core/ui/s_panel.dart';
import 'package:salacope/core/ui/s_toast.dart';
import 'package:salacope/features/listings/data/listings_api.dart';
import 'package:salacope/features/listings/presentation/listing_form.dart';

/// The page of an offer that exists (web: `ListingManagePage`): its sections listed with a summary of each ("Configuré" or
/// "À compléter"); a tap opens the section alone, and back returns to the list ("Rubriques"). Several sections can be changed
/// before saving once; « Enregistrer » is active only when something changed.
class ListingManageScreen extends StatefulWidget {
  final String listingId;
  const ListingManageScreen({super.key, required this.listingId});

  @override
  State<ListingManageScreen> createState() => _ListingManageScreenState();
}

class _ListingManageScreenState extends State<ListingManageScreen> {
  ListingForm? _form;
  String _baseline = '';
  ListingSection? _open;
  ({ListingSection section, String message})? _problem;
  bool _busy = false;

  Listing? get _listing => db.listings.where((l) => l.id == widget.listingId).firstOrNull;

  @override
  void initState() {
    super.initState();
    _reset();
  }

  /// The form starts again from the saved offer (unsaved changes are thrown away).
  void _reset() {
    final l = _listing;
    _form?.dispose();
    _form = l == null ? null : ListingForm.fromListing(l);
    _baseline = _form?.snapshot() ?? '';
    _problem = null;
  }

  @override
  void dispose() {
    _form?.dispose();
    super.dispose();
  }

  bool get _dirty => _form != null && _form!.snapshot() != _baseline;

  Future<void> _save() async {
    final form = _form;
    if (form == null) return;
    final found = firstProblem(form);
    if (found != null) {
      setState(() {
        _problem = found;
        _open = found.section;
      });
      return;
    }
    setState(() {
      _problem = null;
      _busy = true;
    });
    try {
      await listingsApi.updateListing(widget.listingId, form.toInput());
      if (!mounted) return;
      SToast.success(context, 'Modifications enregistrées');
      setState(() => _baseline = form.snapshot());
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _togglePublished(Listing l) async {
    final published = l.status == 'published';
    try {
      await listingsApi.setListingStatus(l.id, published ? 'draft' : 'published');
      if (mounted) SToast.success(context, published ? 'Offre dépubliée' : 'Offre publiée');
    } catch (e) {
      if (mounted) SToast.error(context, e.toString());
    }
  }

  /// Back: from a section to the list; from the list, out (asking first when changes are not saved).
  Future<void> _back() async {
    if (_open != null) {
      setState(() => _open = null);
      return;
    }
    if (_dirty) {
      final leave = await showSConfirm(
        context: context,
        title: 'Quitter sans enregistrer ?',
        description: 'Vos modifications de cette offre seront perdues.',
        confirmLabel: 'Quitter',
        danger: true,
        onConfirm: () => true,
      );
      if (leave != true) return;
    }
    if (mounted) context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return ListenableBuilder(
      listenable: Listenable.merge([db, ?_form]),
      builder: (context, _) {
        final listing = _listing;
        final form = _form;
        if (listing == null || form == null) {
          return SPage(
            title: 'Offre introuvable',
            leading: const BackButton(),
            child: const SEmptyState(title: 'Cette offre n’existe pas ou a été supprimée.'),
          );
        }
        final published = listing.status == 'published';
        final dirty = _dirty;
        final open = _open;

        return PopScope(
          canPop: open == null && !dirty,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) _back();
          },
          child: SPage(
            title: open == null ? listing.title : sectionTitle(open, listing.kind),
            leading: IconButton(icon: const Icon(LucideIcons.arrowLeft), tooltip: open == null ? 'Retour' : 'Rubriques', onPressed: _back),
            meta: open == null ? SBadge(label: published ? 'En ligne' : 'Brouillon', tone: published ? SBadgeTone.success : SBadgeTone.neutral, dot: true) : null,
            actions: [
              if (dirty)
                TextButton(
                  onPressed: () => setState(_reset),
                  child: Text('Annuler', style: SalacopeTypography.label.copyWith(color: colors.textSecondary)),
                ),
              SButton(label: 'Enregistrer', size: SButtonSize.sm, pill: true, isLoading: _busy, onPressed: dirty && !_busy ? _save : null),
              PopupMenuButton<String>(
                icon: Icon(LucideIcons.ellipsisVertical, size: 20, color: colors.textPrimary),
                color: colors.surface,
                onSelected: (v) {
                  if (v == 'voir') context.push('/l/${listing.id}');
                  if (v == 'statut') _togglePublished(listing);
                },
                itemBuilder: (_) => [
                  if (published) const PopupMenuItem(value: 'voir', child: Text('Voir l’offre')),
                  PopupMenuItem(value: 'statut', child: Text(published ? 'Dépublier' : 'Publier')),
                ],
              ),
            ],
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                sliver: SliverToBoxAdapter(child: open == null ? _sections(context, listing) : _section(context, listing, form, open)),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _sections(BuildContext context, Listing listing) {
    final colors = context.colors;
    return SList(
        children: [
          for (final s in ListingSection.values)
            Builder(builder: (context) {
              final summary = sectionSummary(s, listing);
              return SListRow(
                leading: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(color: colors.gray100, shape: BoxShape.circle),
                  child: Icon(sectionIcon(s), size: 16, color: colors.gray500),
                ),
                title: sectionTitle(s, listing.kind),
                subtitle: summary.text,
                trailing: summary.done
                    ? const SBadge(label: 'Configuré', tone: SBadgeTone.success, dot: true)
                    : const SBadge(label: 'À compléter'),
                onTap: () => setState(() => _open = s),
              );
            }),
        ],
    );
  }

  Widget _section(BuildContext context, Listing listing, ListingForm form, ListingSection s) {
    final colors = context.colors;
    final problem = _problem;
    return SPanel(
      titleText: sectionTitle(s, listing.kind),
      descriptionText: sectionHelp(s, listing.kind),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          switch (s) {
            ListingSection.informations => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [ListingInfoFields(form: form), const SizedBox(height: 14), ListingCategoryField(form: form)],
              ),
            ListingSection.description => ListingDescriptionFields(form: form),
            ListingSection.images => ListingImagesFields(form: form),
            ListingSection.prix => ListingPriceFields(form: form),
            ListingSection.livraison => ListingDeliveryFields(form: form, listingId: listing.id),
          },
          if (problem != null && problem.section == s) ...[
            const SizedBox(height: 14),
            Text(problem.message, style: SalacopeTypography.body.copyWith(color: colors.danger)),
          ],
        ],
      ),
    );
  }
}
