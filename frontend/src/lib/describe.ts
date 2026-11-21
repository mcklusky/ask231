/**
 * "Fill in for me" on the ad form, without AI: ready-made sentences built from the title, category,
 * condition and the seller's own words. Free, instant and works offline.
 */
import { SITE_NAME } from '@/config/site'

type Kind = 'job' | 'cv' | 'service' | 'rent' | 'sale-property' | 'item'

export type DescribeInput = { title: string; notes: string; category: string; subcategory: string; condition: 'new' | 'used' | '' }

function kindOf(category: string, subcategory: string): Kind {
  const c = category.toLowerCase(), s = subcategory.toLowerCase()
  if (c === 'jobs') return 'job'
  if (c.startsWith('seeking work')) return 'cv'
  if (c === 'services') return 'service'
  if (c === 'property') return /rent|short let/.test(s) ? 'rent' : 'sale-property'
  return 'item'
}

/** One-tap details buyers usually ask about, by category. Shown as buttons under the description. */
const DETAILS: Record<string, string[]> = {
  'Vehicles': ['Automatic', 'Manual', 'AC works', 'Papers complete', 'Customs cleared', 'New tyres', 'Low mileage', 'Accident free', 'Engine in good condition'],
  'Phones & Tablets': ['Original charger included', 'Unlocked for any network', 'Battery in good condition', 'No scratches', 'Screen has no cracks', 'Box included', 'Dual SIM'],
  'Electronics': ['Works perfectly', 'Charger included', 'Remote included', 'Original box', 'Tested before sale', 'Warranty remaining'],
  'Property': ['Running water', 'Electricity available', 'Fenced and gated', 'Parking space', 'Tiled floors', 'Security', 'Close to main road', 'Documents available'],
  'Home, Furniture & Appliances': ['Works perfectly', 'Like new', 'Solid and strong', 'Easy to move'],
  'Fashion': ['Never worn', 'Worn a few times', 'Original brand', 'True to size'],
  'Beauty & Personal Care': ['Sealed and unused', 'Original product', 'Long expiry date'],
  'Repair & Construction': ['Tested and working', 'Comes with manual', 'Low fuel use', 'Bulk quantity available'],
  'Commercial Equipment & Tools': ['Tested and working', 'Comes with manual', 'Bulk quantity available'],
  'Leisure & Activities': ['Like new', 'All parts included', 'Works perfectly'],
  'Babies & Kids': ['Like new', 'Clean and washed', 'All parts included'],
  'Food, Agriculture & Farming': ['Fresh', 'Locally grown', 'Bulk quantity available'],
  'Animals & Pets': ['Vaccinated', 'Dewormed', 'Healthy and active'],
  'Services': ['Free quote', 'Same-day service', 'Years of experience', 'Tools provided', 'Available weekends'],
  'Jobs': ['Full-time', 'Part-time', 'Experience required', 'No experience needed', 'Training provided', 'Salary negotiable'],
  'Seeking Work & CVs': ['Available immediately', 'Years of experience', 'References available', 'Willing to relocate'],
}
const FOR_ANY_ITEM = ['Price negotiable', 'Delivery available', 'Can test before buying']

export function quickDetails(category: string, subcategory: string) {
  const kind = kindOf(category, subcategory)
  const own = DETAILS[category] ?? []
  return kind === 'item' ? [...own, ...FOR_ANY_ITEM.filter(item => !own.includes(item))] : own
}

function sentence(text: string) {
  const clean = text.trim().replace(/[\s.,;:!-]+$/, '')
  return clean ? clean[0].toUpperCase() + clean.slice(1) : ''
}

/** The opening and closing lines for this kind of ad. */
function frame(input: DescribeInput) {
  const kind = kindOf(input.category, input.subcategory)
  const title = sentence(input.title) || sentence(input.subcategory) || 'This item'
  const openings: Record<Kind, string> = {
    'job': `We are hiring: ${title}.`,
    'cv': `${title}. Available for work.`,
    'service': `${title}.`,
    'rent': `${title}, available for rent.`,
    'sale-property': `${title}, for sale.`,
    'item': input.condition === 'new' ? `${title}, brand new.` : input.condition === 'used' ? `${title}, used and ready for a new owner.` : `${title}, for sale.`,
  }
  const closings: Record<Kind, string> = {
    'job': `Interested? Send us a message on ${SITE_NAME} to apply.`,
    'cv': `Send me a message on ${SITE_NAME} if you would like to hire me.`,
    'service': `Send me a message on ${SITE_NAME} for a quote.`,
    'rent': `Message me on ${SITE_NAME} to arrange a viewing.`,
    'sale-property': `Message me on ${SITE_NAME} to arrange a viewing.`,
    'item': `Message me on ${SITE_NAME} if you have any questions or want to see it.`,
  }
  return { opening: openings[kind], closing: closings[kind] }
}

const CONTACT = /(https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+|\+?\d[\d\s().-]{6,}\d)/i

/**
 * The seller's notes as separate details: split on new lines, commas and semicolons. Whole lines in
 * `skipLines` (our own opening and closing) are ignored, and any part with contact details is dropped.
 */
export function detailsFrom(notes: string, skipLines: string[] = []) {
  const skip = new Set(skipLines.map(line => line.trim().toLowerCase()))
  const seen = new Set(skip)
  const details: string[] = []
  const lines = notes.split('\n').filter(line => !skip.has(line.trim().toLowerCase()))
  for (const part of lines.join('\n').split(/[\n,;]+/)) {
    if (CONTACT.test(part)) continue
    const item = sentence(part.replace(/^[\s•*\-–]+/, '').replace(/\s{2,}/g, ' '))
    const key = item.toLowerCase()
    if (item.length < 2 || seen.has(key) || seen.has(`${key}.`)) continue
    seen.add(key); details.push(item)
  }
  return details
}

/** Build the description. Running it again on its own output gives the same text. */
export function fillDescription(input: DescribeInput) {
  const { opening, closing } = frame(input)
  const details = detailsFrom(input.notes, [opening, closing, sentence(input.title)])
  return [opening, details.map(item => `• ${item}`).join('\n'), closing].filter(Boolean).join('\n\n')
}

/** Add a one-tap detail as its own line, unless it is already there. */
export function addDetail(notes: string, detail: string) {
  if (hasDetail(notes, detail)) return notes
  const trimmed = notes.replace(/\s+$/, '')
  return trimmed ? `${trimmed}\n• ${detail}` : `• ${detail}`
}

export function hasDetail(notes: string, detail: string) {
  return detailsFrom(notes).some(item => item.toLowerCase() === detail.toLowerCase())
}
