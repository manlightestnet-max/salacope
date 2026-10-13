import 'dart:convert';
import 'dart:math' as math;
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/config/explore.dart';
import '../../../core/db/models/database.dart';
import '../../../core/db/models/listing.dart';
import 'catalog_model.dart';

/// The Explorer's ranking, the same as the web (`src/features/catalog/ranking.ts`): every signal comes from the database
/// (sales, visits, favourites, store rating, age) or from what this person did (kept on this phone only), never
/// invented; the administration sets how much each one counts. A small daily rotation and a limit per store keep the feed
/// moving and fair: new creators are seen, no store fills the screen.

// ---------------------------------------------------------------- words

String fold(String s) {
  const from = 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ’\'';
  const to = 'aaaaaaceeeeiiiinooooouuuuyyoe  ';
  final b = StringBuffer();
  for (final ch in s.toLowerCase().split('')) {
    final i = from.indexOf(ch);
    b.write(i >= 0 ? to[i] : ch);
  }
  return b.toString();
}

const _stop = {
  'les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'par', 'aux', 'est', 'son', 'ses', 'vos', 'votre', 'vous', 'nous', 'notre',
  'leur', 'leurs', 'qui', 'que', 'quoi', 'dont', 'tout', 'tous', 'toute', 'toutes', 'plus', 'moins', 'tres', 'bien', 'comme', 'sans',
  'sous', 'entre', 'chez', 'mais', 'donc', 'ainsi', 'cette', 'ces', 'cet', 'sont', 'etre', 'avoir', 'fait', 'faire', 'mon', 'mes',
  'ton', 'tes', 'the', 'and', 'for', 'with', 'your', 'from', 'into', 'guide',
};

List<String> words(String s) => fold(s).split(RegExp(r'[^a-z0-9]+')).where((w) => w.length >= 3 && !_stop.contains(w)).toSet().toList();

String stem(String w) => w.length > 6 ? w.substring(0, math.max(5, w.length - 3)) : (w.endsWith('s') ? w.substring(0, w.length - 1) : w);

bool nearlySame(String a, String b) {
  if (a == b) return true;
  if (a.length < 5 || b.length < 5 || (a.length - b.length).abs() > 1) return false;
  var i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] == b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) {
      i++;
    } else if (b.length > a.length) {
      j++;
    } else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// ---------------------------------------------------------------- taste (this phone only)

/// What this person looked at, saved and searched, kept on this phone (never sent). Older interests fade, half every two
/// weeks. Without any history nothing is guessed: the ranking uses the catalogue's own signals.
class Taste {
  Map<String, double> categories;
  Map<String, double> sellers;
  Map<String, double> terms;
  Map<String, int> seen;
  int at;

  Taste({Map<String, double>? categories, Map<String, double>? sellers, Map<String, double>? terms, Map<String, int>? seen, int? at})
      : categories = categories ?? {},
        sellers = sellers ?? {},
        terms = terms ?? {},
        seen = seen ?? {},
        at = at ?? DateTime.now().millisecondsSinceEpoch;

  bool get isEmpty => categories.isEmpty;

  static const _key = 'salacope.taste';
  static Taste? _cached;

  /// Read once per visit: opening an offer never reshuffles the feed under the person's eyes.
  static Taste? visit;

  static Future<Taste> load() async {
    if (_cached != null) return _cached!;
    try {
      final raw = (await SharedPreferences.getInstance()).getString(_key);
      final j = raw == null ? null : jsonDecode(raw) as Map<String, dynamic>;
      Map<String, double> m(Object? v) => (v is Map ? v : const {}).map((k, x) => MapEntry('$k', (x as num).toDouble()));
      final t = j == null
          ? Taste()
          : Taste(
              categories: m(j['categories']),
              sellers: m(j['sellers']),
              terms: m(j['words']),
              seen: (j['seen'] is Map ? j['seen'] as Map : const {}).map((k, x) => MapEntry('$k', (x as num).toInt())),
              at: (j['at'] as num?)?.toInt(),
            );
      final days = (DateTime.now().millisecondsSinceEpoch - t.at) / 86400000;
      if (days >= .5) {
        final f = math.pow(.5, days / 14).toDouble();
        void scale(Map<String, double> map) {
          map.updateAll((_, v) => v * f);
          map.removeWhere((_, v) => v < .05);
        }

        scale(t.categories);
        scale(t.sellers);
        scale(t.terms);
        t.at = DateTime.now().millisecondsSinceEpoch;
      }
      return _cached = t;
    } catch (_) {
      return _cached = Taste();
    }
  }

  static Future<void> _save(Taste t) async {
    _cached = t;
    try {
      (await SharedPreferences.getInstance()).setString(_key, jsonEncode({'categories': t.categories, 'sellers': t.sellers, 'words': t.terms, 'seen': t.seen, 'at': t.at}));
    } catch (_) {}
  }

  static Map<String, double> _top(Map<String, double> m, int n) {
    final e = m.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return Map.fromEntries(e.take(n));
  }

  static const _weight = {'view': 1.0, 'click': 3.0, 'like': 4.0, 'buy': 6.0};

  static Future<void> noteListing(Listing l, String gesture) async {
    final t = await load();
    final w = _weight[gesture] ?? 1.0;
    t.categories[l.category] = (t.categories[l.category] ?? 0) + w;
    t.sellers[l.sellerId] = (t.sellers[l.sellerId] ?? 0) + w;
    t.sellers = _top(t.sellers, 40);
    for (final word in words('${l.title} ${l.features.take(4).join(' ')}')) {
      final s = stem(word);
      t.terms[s] = (t.terms[s] ?? 0) + w * .5;
    }
    t.terms = _top(t.terms, 80);
    if (gesture == 'view') t.seen[l.id] = DateTime.now().millisecondsSinceEpoch;
    if (t.seen.length > 200) {
      final e = t.seen.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
      t.seen = Map.fromEntries(e.take(200));
    }
    await _save(t);
  }

  static Future<void> noteSearch(String text) async {
    final t = await load();
    for (final word in words(text)) {
      final s = stem(word);
      t.terms[s] = (t.terms[s] ?? 0) + 2;
    }
    t.terms = _top(t.terms, 80);
    await _save(t);
  }

  static Future<void> clear() async {
    visit = null;
    await _save(Taste());
  }
}

// ---------------------------------------------------------------- ranking

/// Changes the rotation per phone for visitors (signed-in people use their account).
String deviceSeed = 'visitor';

/// At launch: this visit's interests, read once, and the phone's rotation seed.
Future<void> initRanking() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    var seed = prefs.getString('salacope.seed');
    if (seed == null) {
      seed = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
      await prefs.setString('salacope.seed', seed);
    }
    deviceSeed = seed;
  } catch (_) {}
  Taste.visit = await Taste.load();
}

class RankContext {
  final ExploreSettings settings;
  final Taste taste;
  final Database state;
  final Set<String> favorites;
  final Set<String> follows;
  final Set<String> bought;
  final String seed;
  final int now;

  RankContext({required this.settings, required this.taste, required this.state, required this.favorites, required this.follows, required this.bought, required this.seed, required this.now});

  factory RankContext.of(Database state, String deviceSeed) {
    final me = state.sessionUserId;
    final day = DateTime.now().toUtc().toIso8601String().substring(0, 10);
    return RankContext(
      settings: exploreSettings.value,
      taste: Taste.visit ?? Taste(),
      state: state,
      favorites: state.favorites.map((f) => f.listingId).toSet(),
      follows: state.follows.map((f) => f.sellerId).toSet(),
      bought: state.orders.where((o) => o.buyerId == me && o.status != 'cancelled').map((o) => o.listingId).toSet(),
      seed: '$day:${me ?? deviceSeed}',
      now: DateTime.now().millisecondsSinceEpoch,
    );
  }
}

double _jitter(String seed, String id) {
  var h = 2166136261;
  for (final c in (seed + id).codeUnits) {
    h = ((h ^ c) * 16777619) & 0xffffffff;
  }
  return (h % 10000) / 10000;
}

double _maxOf(Iterable<double> v) => v.fold<double>(1e-9, math.max);

Map<String, double> scoreListings(List<ListingView> views, RankContext ctx) {
  final w = ctx.settings.weights;
  final signals = ctx.state.stats.signals;
  final sales = views.map((v) => math.log(1 + v.salesCount)).toList();
  final visits = views.map((v) => math.log(1 + (signals[v.listing.id]?.views ?? 0))).toList();
  final favs = views.map((v) => math.log(1 + (signals[v.listing.id]?.favorites ?? 0))).toList();
  final maxSales = _maxOf(sales), maxVisits = _maxOf(visits), maxFavs = _maxOf(favs);
  final t = ctx.taste;
  final catScale = _maxOf(t.categories.values), sellerScale = _maxOf(t.sellers.values), wordScale = _maxOf(t.terms.values) * 2;
  final hasTaste = !t.isEmpty || ctx.follows.isNotEmpty;
  final total = w.total == 0 ? 1 : w.total;
  final out = <String, double>{};
  for (var i = 0; i < views.length; i++) {
    final l = views[i].listing;
    final seller = ctx.state.stats.sellers[l.sellerId];
    final rating = seller != null && seller.reviews > 0 ? ((seller.rating * seller.reviews + 3.5 * 5) / (seller.reviews + 5) - 1) / 4 : 0.0;
    final published = DateTime.tryParse(l.publishedAt ?? l.createdAt)?.millisecondsSinceEpoch ?? ctx.now;
    final ageDays = (ctx.now - published) / 86400000;
    final fresh = math.max(0.0, 1 - ageDays / ctx.settings.freshDays);
    var affinity = 0.0;
    if (hasTaste) {
      final cat = (t.categories[l.category] ?? 0) / catScale;
      final sel = math.min(1.0, ((t.sellers[l.sellerId] ?? 0) + (ctx.follows.contains(l.sellerId) ? sellerScale * .6 : 0)) / sellerScale);
      final ws = words('${l.title} ${l.features.take(4).join(' ')}').map(stem).toList();
      final word = ws.isEmpty ? 0.0 : math.min(1.0, ws.fold<double>(0, (s, x) => s + (t.terms[x] ?? 0)) / wordScale);
      affinity = math.min(1.0, .4 * cat + .3 * sel + .3 * word);
    }
    var score = (w.sales * (sales[i] / maxSales) +
            w.views * (visits[i] / maxVisits) +
            w.favorites * (favs[i] / maxFavs) +
            w.rating * rating +
            w.freshness * fresh +
            w.taste * affinity +
            w.rotation * _jitter(ctx.seed, l.id)) /
        total;
    if (ctx.bought.contains(l.id) && l.kind == 'digital') score *= .2;
    final seenAt = t.seen[l.id];
    if (seenAt != null && ctx.now - seenAt < 2 * 86400000) score *= .85;
    if (ctx.favorites.contains(l.id)) score *= .9;
    out[l.id] = score;
  }
  return out;
}

/// No more than `run` offers of one store in a row: the next best offer of another store is pulled up.
List<ListingView> spreadSellers(List<ListingView> sorted, int run) {
  final rest = List.of(sorted);
  final out = <ListingView>[];
  while (rest.isNotEmpty) {
    final last = out.length >= run ? out.sublist(out.length - run) : const <ListingView>[];
    final tooMany = last.length == run && last.every((v) => v.listing.sellerId == last.first.listing.sellerId);
    var i = tooMany ? rest.indexWhere((v) => v.listing.sellerId != last.first.listing.sellerId) : 0;
    if (i < 0) i = 0;
    out.add(rest.removeAt(i));
  }
  return out;
}

List<ListingView> rankListings(List<ListingView> views, RankContext ctx, [Map<String, double>? relevance]) {
  final scores = scoreListings(views, ctx);
  final top = relevance == null ? 1.0 : _maxOf(relevance.values);
  double fin(ListingView v) => relevance != null ? (relevance[v.listing.id] ?? 0) / top + .35 * scores[v.listing.id]! : scores[v.listing.id]!;
  final sorted = List.of(views)
    ..sort((a, b) {
      final c = fin(b).compareTo(fin(a));
      return c != 0 ? c : b.listing.createdAt.compareTo(a.listing.createdAt);
    });
  return relevance != null ? sorted : spreadSellers(sorted, ctx.settings.sellerRun);
}

/// How well an offer answers the words typed (0 = not at all): accents and capitals ignored, plurals and close forms
/// match, one wrong letter forgiven on long words. The whole phrase in the title counts most.
double textScore(ListingView v, String text) {
  final q = fold(text).trim();
  if (q.isEmpty) return 1;
  final l = v.listing;
  if (fold(l.id) == q) return 100;
  final title = fold(l.title);
  final fTitle = words(l.title), fStore = words(v.seller?.merchant?.storeName ?? ''), fSummary = words('${l.summary} ${l.features.join(' ')}'), fDesc = words(l.description);
  final terms = words(q);
  if (terms.isEmpty) return title.contains(q) ? 5 : 0;
  var score = title.contains(q) ? 10.0 : 0.0;
  var matched = 0;
  for (final term in terms) {
    final s = stem(term);
    bool hit(List<String> list) => list.any((w) => w.startsWith(s) || stem(w) == s || nearlySame(w, term));
    final best = hit(fTitle) ? 4 : hit(fStore) ? 3 : hit(fSummary) ? 2 : hit(fDesc) ? 1 : 0;
    if (best > 0) matched++;
    score += best;
  }
  if (matched == 0) return 0;
  return score * (matched / terms.length);
}

/// Offers close to this one (same subject in other words, same category), for "Dans le même esprit".
List<ListingView> similarListings(ListingView to, List<ListingView> all, [int count = 8]) {
  final mine = words('${to.listing.title} ${to.listing.summary} ${to.listing.features.join(' ')}').map(stem).toSet();
  if (mine.isEmpty) return const [];
  final scored = <(ListingView, double, int)>[];
  for (final v in all) {
    if (v.listing.id == to.listing.id) continue;
    final theirs = words('${v.listing.title} ${v.listing.summary} ${v.listing.features.join(' ')}').map(stem).toList();
    final common = theirs.where(mine.contains).length;
    if (common == 0) continue;
    final s = common / math.sqrt(mine.length * math.max(1, theirs.length)) + (v.listing.category == to.listing.category ? .15 : 0);
    scored.add((v, s, common));
  }
  scored.sort((a, b) => b.$2.compareTo(a.$2));
  return scored.take(count).map((x) => x.$1).toList();
}

/// While typing: real offer titles and stores that answer the words, then matching categories.
List<({String kind, String label, String value})> searchSuggestions(List<ListingView> all, String text, [int count = 7]) {
  final q = fold(text).trim();
  if (q.length < 2) return const [];
  final out = <({String kind, String label, String value})>[];
  final scored = all.map((v) => (v, textScore(v, q))).where((x) => x.$2 > 0).toList()
    ..sort((a, b) {
      final c = b.$2.compareTo(a.$2);
      return c != 0 ? c : b.$1.salesCount.compareTo(a.$1.salesCount);
    });
  final stores = <String, String>{};
  for (final (v, _) in scored) {
    if (out.length < count - 2) out.add((kind: 'offer', label: v.listing.title, value: v.listing.title));
    final name = v.seller?.merchant?.storeName;
    if (name != null && fold(name).contains(q)) stores[v.listing.sellerId] = name;
  }
  for (final name in stores.values) {
    if (out.length < count) out.add((kind: 'store', label: name, value: name));
  }
  for (final c in categoriesConfig) {
    if (out.length < count && fold(c.label).contains(q)) out.add((kind: 'category', label: c.label, value: c.id));
  }
  return out;
}
