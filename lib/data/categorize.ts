// Runtime product categoriser for Arabic food-item descriptions. Mirror of the rules in
// DATA/_salesgen.js — keep the two in sync. Covers every product family present in MEC's data so that
// nothing falls into a vague "Other" bucket. Checked in priority order.
export type Category = 'Poultry' | 'Beef' | 'Lamb' | 'Processed' | 'Dairy' | 'Vegetables' | 'Other'
export type CatInfo = { category: Category; categoryAr: string; origin: string; originAr: string }

const CAT_AR: Record<Category, string> = {
  Poultry: 'دواجن', Beef: 'لحوم بقري', Lamb: 'لحوم غنم', Processed: 'منتجات مصنّعة', Dairy: 'أجبان وألبان', Vegetables: 'خضروات', Other: 'أخرى'
}

export function categorize(itemRaw: string): CatInfo {
  const s = String(itemRaw || '')
  let category: Category = 'Other'
  // 1) Poultry — check chicken cues first (فيل ليج = chicken leg, must beat the generic "فيل")
  if (/دجاج|صدور|صدر|ارجل|أرجل|اجنحة|أجنحة|فيل ليج|ليجز|ورك|أوراك|افخاذ|كبد دجاج|شاورما دجاج/.test(s)) category = 'Poultry'
  // 2) Lamb / mutton
  else if (/خروف|غنم|ضأن|ضاني|حري|موزات/.test(s)) category = 'Lamb'
  // 3) Dairy
  else if (/جبن|جبنة|زبد|زبدة|لبن|حليب|قشطة|كريم/.test(s)) category = 'Dairy'
  // 4) Processed
  else if (/شاورما|برجر|برغر|كباب|كفتة|ناجت|نقانق|مرتديلا|هوت دوج|سجق|كبة/.test(s)) category = 'Processed'
  // 5) Vegetables
  else if (/بطاطس|خضار|خضروات|بصل|طماطم|فلفل|بازلاء|جزر/.test(s)) category = 'Vegetables'
  // 6) Beef / red-meat cuts (broad — most of MEC's high-value SKUs)
  else if (/توب سايد|سلفر سايد|فور كوارتر|فور كورتر|فوركوارتر|كوارتر|تندر ليون|تندرليون|رامب|ستيك|فلانك|ثك فلانك|فيليه|فخدة|فخذ|عجل|بقر|بقري|لحم|رول|سلايس|بوبي فيل|تمام|نخاع|كبدة|ريش|عصب/.test(s)) category = 'Beef'
  // 7) anything still unmatched but clearly a meat carton defaults to Beef (MEC is a red-meat importer)
  else if (s.trim().length > 0) category = 'Beef'

  let origin = '', originAr = ''
  if (/هندي|الهند/.test(s)) { origin = 'India'; originAr = 'الهند' }
  else if (/برازيلي|البرازيل/.test(s)) { origin = 'Brazil'; originAr = 'البرازيل' }
  else if (/استرالي|أسترالي/.test(s)) { origin = 'Australia'; originAr = 'أستراليا' }
  else if (/روسي|روسيا/.test(s)) { origin = 'Russia'; originAr = 'روسيا' }
  else if (/فرنسي|فرنسا/.test(s)) { origin = 'France'; originAr = 'فرنسا' }
  return { category, categoryAr: CAT_AR[category], origin, originAr }
}

export function categoryLabel(cat: string, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? (CAT_AR[cat as Category] ?? cat) : cat
}
