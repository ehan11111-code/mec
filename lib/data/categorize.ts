// Runtime product categoriser for Arabic food-item descriptions. Mirror of the rules in
// DATA/_salesgen.js — keep the two in sync. Used when new data is pasted in the app, and as the
// canonical category labels (EN/AR) for any item.
export type Category = 'Poultry' | 'Beef' | 'Vegetables' | 'Processed' | 'Other'
export type CatInfo = { category: Category; categoryAr: string; origin: string; originAr: string }

const CAT_AR: Record<Category, string> = { Poultry: 'دواجن', Beef: 'لحوم', Vegetables: 'خضروات', Processed: 'مصنّعة', Other: 'أخرى' }

export function categorize(itemRaw: string): CatInfo {
  const s = String(itemRaw || '')
  let category: Category = 'Other'
  if (/دجاج|صدور|ارجل|أرجل|اجنحة|أجنحة|فيليه دجاج|بوبي فيل|فيل ليجز|فيل/.test(s)) category = 'Poultry'
  else if (/لحم|توب سايد|سلفر سايد|توب|بيف|عجل|بقري|غنم|كبدة|ريش/.test(s)) category = 'Beef'
  else if (/بطاطس|خضار|بصل|طماطم|فلفل/.test(s)) category = 'Vegetables'
  else if (/شاورما|برجر|كباب|مصنّع|مصنع|ناجت|كبة/.test(s)) category = 'Processed'
  let origin = '', originAr = ''
  if (/هندي|الهند/.test(s)) { origin = 'India'; originAr = 'الهند' }
  else if (/برازيلي|البرازيل/.test(s)) { origin = 'Brazil'; originAr = 'البرازيل' }
  else if (/استرالي|أسترالي/.test(s)) { origin = 'Australia'; originAr = 'أستراليا' }
  else if (/فرنسي|فرنسا/.test(s)) { origin = 'France'; originAr = 'فرنسا' }
  return { category, categoryAr: CAT_AR[category], origin, originAr }
}

export function categoryLabel(cat: string, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? (CAT_AR[cat as Category] ?? cat) : cat
}
