import { Link } from 'react-router-dom'
import LegalPage, { type LegalSection } from '@/components/LegalPage'
import { LEGAL } from '@/lib/legal'
import { COUNTRY_NAME, SITE_NAME } from '@/config/site'

const sections: LegalSection[] = [
  { id: 'about', title: `About ${SITE_NAME}`, body: <>
    <p>{SITE_NAME} is an online classifieds marketplace where people and businesses advertise items and services and contact each other. {SITE_NAME} is operated by <strong>{LEGAL.operator}</strong> (“we”, “us”).</p>
    <p><strong>We are not a party to any sale.</strong> Buyers and sellers deal directly with each other. We do not own, inspect, hold, deliver or guarantee any item, and we do not process payments.</p>
  </> },
  { id: 'accounts', title: 'Your account', body: <>
    <ul>
      <li>You must be at least 18 years old to create an account.</li>
      <li>Give accurate information, including a working email address and phone number. You need to confirm your email before you can post ads or send messages.</li>
      <li>Keep your password private. You are responsible for activity on your account. Tell us straight away if you think someone else has used it.</li>
      <li>One person or business may hold one account. Do not create accounts to get around a suspension.</li>
    </ul>
  </> },
  { id: 'posting', title: 'Posting advertisements', body: <>
    <p>When you post an advertisement you confirm that:</p>
    <ul>
      <li>you own the item or are allowed to sell or offer it;</li>
      <li>the title, description, price, condition, location and photos are honest and accurate, and the photos show the actual item;</li>
      <li>the price is in the currency you choose (L$, US$ or another) and you will honour it, subject to agreement with the buyer;</li>
      <li>you will mark the ad as sold or delete it when it is no longer available.</li>
    </ul>
    <p>Every new or edited advertisement is reviewed by our team before it appears publicly. We may reject, edit for formatting, suspend or remove any advertisement, and we will usually tell you why.</p>
  </> },
  { id: 'prohibited', title: 'Prohibited items and content', body: <>
    <p>You must not advertise or offer:</p>
    <ul>
      <li>weapons, ammunition or explosives;</li>
      <li>illegal drugs, or prescription medicines without proper authorisation;</li>
      <li>stolen, counterfeit or smuggled goods, or goods that infringe someone else’s rights;</li>
      <li>protected wildlife or products made from them;</li>
      <li>adult or sexual services or content;</li>
      <li>personal documents, identity cards, or databases of personal information;</li>
      <li>“get rich quick” schemes, pyramid schemes, loans requiring advance fees, or anything designed to take money by deception;</li>
      <li>anything else that is illegal in {COUNTRY_NAME} or in the place where it would be sold.</li>
    </ul>
    <p>You also must not post content that is hateful, threatening, harassing or misleading, or that includes other people’s personal information without their permission.</p>
  </> },
  { id: 'conduct', title: `Using ${SITE_NAME} safely and fairly`, body: <>
    <ul>
      <li>Treat other users with respect. Do not spam, harass or threaten anyone.</li>
      <li>Do not use {SITE_NAME} messages to send unrelated advertising or to collect people’s details.</li>
      <li>Do not ask buyers to pay in advance for items they have not seen, and never ask for verification codes, PINs or passwords.</li>
      <li>Do not copy, scrape or overload the website, or try to get around our security or rate limits.</li>
    </ul>
    <p><strong>Stay safe:</strong> meet in a busy public place, check the item before you pay, and never send money or mobile money in advance. If something feels wrong, use “Report this listing”.</p>
  </> },
  { id: 'transactions', title: 'Deals between buyers and sellers', body: <>
    <p>Any agreement to buy, sell or provide a service is made only between the buyer and the seller. They are responsible for the item, its quality and legality, payment, delivery, and any taxes. Offers made through {SITE_NAME} are messages between users and are not binding on us.</p>
    <p>If a deal goes wrong, try to resolve it with the other person first. You can report the listing or account to us, and we may suspend accounts that break these Terms, but we cannot refund payments or guarantee an outcome.</p>
  </> },
  { id: 'verification', title: 'Verified sellers and promotions', body: <>
    <p>A “Verified seller” badge means our team has reviewed that seller’s profile. It is not a guarantee of any item or deal, and we may remove the badge at any time.</p>
    <p>Featured or promoted placements are arranged by our team. Their terms and any fees will be agreed separately before they start.</p>
  </> },
  { id: 'reports', title: 'Reports, moderation and suspension', body: <>
    <p>Anyone signed in can report a listing. Our team reviews reports and may remove listings or suspend accounts that break these Terms or put others at risk, with or without notice where safety requires it. To appeal a decision, email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.</p>
  </> },
  { id: 'content', title: 'Your content', body: <>
    <p>You keep ownership of the text and photos you post. You give us permission to store, display, resize and share them on {SITE_NAME} and in link previews (for example when an ad is shared on WhatsApp or Facebook) for as long as the ad is on {SITE_NAME}. We remove hidden photo information, such as location data, when you upload.</p>
    <p>The {SITE_NAME} name, logo and website design belong to us.</p>
  </> },
  { id: 'liability', title: 'Our responsibility to you', body: <>
    <p>We work to keep {SITE_NAME} available, accurate and safe, but we provide it “as is”. To the extent the law allows, we are not responsible for:</p>
    <ul>
      <li>items, services, payments or meetings arranged between users;</li>
      <li>the accuracy of advertisements or the conduct of other users;</li>
      <li>losses caused by interruptions, errors or events outside our reasonable control.</li>
    </ul>
    <p>Nothing in these Terms limits any responsibility that cannot be limited by law.</p>
  </> },
  { id: 'ending', title: 'Closing your account', body: <>
    <p>You can stop using {SITE_NAME} at any time and delete your advertisements from <Link to="/my-ads">My ads</Link>. To close your account, email us and we will deal with your data as described in the <Link to="/privacy">Privacy Policy</Link>. We may close accounts that seriously or repeatedly break these Terms.</p>
  </> },
  { id: 'changes', title: 'Changes and governing law', body: <>
    <p>We may update these Terms. If a change is significant we will tell you on the website or by email before it takes effect. Continuing to use {SITE_NAME} after a change means you accept the updated Terms.</p>
    <p>These Terms are governed by {LEGAL.governingLaw}.</p>
    <p>Contact: <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> · {LEGAL.address}</p>
  </> },
]

export default function Terms() {
  return <LegalPage title="Terms of Use" sections={sections} intro={<p>These Terms explain the rules for using {SITE_NAME}, {COUNTRY_NAME}’s local buy-and-sell marketplace. By creating an account, posting an advertisement or contacting another user, you agree to them. Please read them, especially the sections on prohibited items and on deals between buyers and sellers.</p>} />
}
