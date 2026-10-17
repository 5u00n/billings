import React, { useState } from 'react';
import {
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Landmark,
  Scale,
  FileText,
  DollarSign,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  Flame,
  Briefcase,
  TrendingUp,
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  icon: any;
  summary: string;
  content: React.ReactNode;
}

export const TaxGuideView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('sec-sbi-rules');

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const guideSections: GuideSection[] = [
    {
      id: 'sec-sbi-rules',
      title: 'State Bank of India (SBI) Current Account: Rules, MAB & Charges Playbook',
      badge: 'SBI Specific',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: Landmark,
      summary:
        'Specific rules for your SBI Individual Current Account at Chakulia branch (SBIN0014355) — MAB ₹5,000, 100x MAB cash deposit formula, Surabhi auto-sweep interest perk, and the Two-Account Flow.',
      content: (
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-950 dark:text-blue-200">
            <h4 className="font-semibold text-base flex items-center gap-2 mb-1">
              <Landmark className="w-5 h-5 text-blue-600 shrink-0" />
              Your Registered SBI Account: Chakulia Branch (East Singhbhum, Jharkhand)
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Account No: <strong>45661497562</strong> | IFSC: <strong>SBIN0014355</strong> | Category:{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">Semi-Urban / Rural Branch</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <h5 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                1. Monthly Average Balance (MAB) Requirement
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  • <strong>Minimum MAB:</strong> <strong>₹5,000</strong> (for Semi-Urban Chakulia branch vs ₹10,000 for Metro).
                </li>
                <li>
                  • <strong>Shortfall Penalty:</strong> If MAB drops below ₹5,000, SBI levies <strong>₹500 to ₹1,000 + 18% GST</strong> per month.
                </li>
                <li className="text-emerald-600 dark:text-emerald-400 font-medium">
                  • <strong>Tax Tip:</strong> All SBI bank charges, SMS alert fees (₹15/quarter), and debit card AMC are <strong>100% tax-deductible business expenses u/s 37(1)</strong>!
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <h5 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                2. SBI Free Cash Deposit Limit Formula
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  • <strong>The 100x MAB Rule:</strong> SBI allows free cash deposits up to <strong>100 times previous month’s MAB</strong> (maximum cap of ₹5,00,000/month).
                </li>
                <li>
                  • <strong>Charges Beyond Free Limit:</strong> ₹0.75 per ₹1,000 (minimum ₹50, maximum ₹20,000 + GST).
                </li>
                <li>
                  • <strong>Non-Home Branch Limit:</strong> Cash deposit at non-home branches (e.g. Jamshedpur or Ghatshila) is capped at ₹2 Lakhs to ₹5 Lakhs per day.
                </li>
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <h5 className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                3. The "SBI Surabhi" Auto-Sweep Secret (Earn 6.5%+ Interest)
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Standard Current Accounts earn <strong>0.00% interest</strong>. However, SBI offers the <strong>Surabhi Current Account</strong> feature.
                Any balance above a threshold (typically ₹50,000) automatically sweeps into a term deposit (MOD) earning <strong>6.5%–7.0% p.a.</strong>, while remaining 100% liquid for cheque and UPI clearance! You can request Chakulia branch to enable Surabhi sweep-in on your account.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <h5 className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                4. The "Golden Two-Account Flow"
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                To keep your SBI Current Account 100% audit-proof:
                <br />
                <strong>Step 1:</strong> Clients pay into your SBI Current Account.
                <br />
                <strong>Step 2:</strong> Transfer a monthly lump sum (e.g., ₹25,000) to your <strong>Personal Savings Account</strong> as <strong>"Owner's Drawings"</strong>.
                <br />
                <strong>Step 3:</strong> Spend on daily groceries, family items, and dining from your Savings Account. Your Current Account remains pristine for CA review!
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-950 dark:text-violet-200">
            <strong>Transferring Personal Savings to SBI Current Account?</strong> Always tag such inward transfers as{' '}
            <strong>"Capital Introduced"</strong> in this app. This proves to the Income Tax Department's AIS algorithm that the funds are your own post-tax savings and NOT undeclared client business revenue!
          </div>
        </div>
      ),
    },
    {
      id: 'sec-current-ac',
      title: 'Individual Current Account: The 7 Golden Rules & Catches',
      badge: 'Critical Rule',
      badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      icon: Landmark,
      summary:
        'Understanding how SBI / Indian banks report your Current Account transactions to the Income Tax Department via SFT, and why personal spending must be marked as "Drawings".',
      content: (
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
            <h4 className="font-semibold text-base flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              The No. 1 Misconception: "Can I use my Current Account for personal expenses?"
            </h4>
            <p>
              <strong>YES, you can legally spend money from your Current Account for personal needs</strong>, but in
              accounting and tax law, that money is considered <strong>"Owner\'s Drawings"</strong>. You{' '}
              <span className="underline font-semibold">CANNOT</span> claim personal groceries, family shopping, movie
              tickets, or personal doctor bills as a business deduction to reduce your taxable income. Doing so is
              considered <strong>misreporting of income under Section 270A</strong>, which carries a 200% penalty on tax
              evaded.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-2">
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Valid Business Expenses (Section 37(1))
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
                <li>Web hosting, AWS/Vercel/DigitalOcean, domain fees</li>
                <li>Software subscriptions (Figma, GitHub, Adobe, IDEs)</li>
                <li>Broadband & mobile (apportioned business usage)</li>
                <li>Office equipment, laptop repairs, stationery</li>
                <li>Client meetings & project travel expenses</li>
                <li>Contractor payments, freelance sub-hiring fees</li>
                <li>Depreciation on laptop, camera, gadgets (Section 32)</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <div className="flex items-center gap-2 font-semibold text-rose-600 dark:text-rose-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Personal Drawings (Non-Deductible)
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
                <li>Home groceries (Blinkit, Zepto, local stores)</li>
                <li>Personal apparel, cosmetics, personal gifts</li>
                <li>Family medical bills (Deductible u/s 80D, NOT business)</li>
                <li>Personal cinema, weekend dinners, personal holidays</li>
                <li>Personal life insurance (LIC) (Claim u/s 80C instead)</li>
                <li>Home electricity & personal rent</li>
                <li>Cash given to friends/family without invoice proof</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <h5 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              SFT (Statement of Financial Transactions) by Banks (Rule 114E)
            </h5>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Your bank (State Bank of India) automatically files <strong>Form 61A</strong> reporting high-value cash
              transactions directly to the Income Tax Department:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
              <li>
                <strong>Current Account Cash Limit:</strong> Aggregate cash deposits or cash withdrawals of{' '}
                <strong className="text-rose-500">₹50,00,000 (₹50 Lakhs)</strong> or more in a Financial Year.
              </li>
              <li>
                <strong>Savings Account Cash Limit:</strong> Aggregate cash deposits of{' '}
                <strong className="text-rose-500">₹10,00,000</strong> or more.
              </li>
              <li>
                <strong>Section 194N TDS:</strong> 2% TDS on cash withdrawals exceeding ₹1 Crore (or ₹20 Lakhs if you
                haven't filed ITR for the last 3 years).
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'sec-44ada-44ad',
      title: 'Section 44ADA & 44AD: The Freelancer & Small Business Lifesaver',
      badge: 'Tax Saver',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: Briefcase,
      summary:
        'How to legally declare 50% profit without keeping complex accounting books or hiring an auditor under Presumptive Taxation.',
      content: (
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            The Government of India provides a special <strong>Presumptive Taxation Scheme</strong> under Sections 44ADA
            and 44AD to relieve professionals and small business proprietors from the burden of maintaining extensive
            ledgers and mandatory audits.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                Section 44ADA (For Professionals & Freelancers)
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Eligible: Software developers, IT consultants, designers, technical consultants, accountants, engineers,
                legal professionals.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  • <strong>Gross Turnover Limit:</strong> Up to ₹50 Lakhs (or <strong>₹75 Lakhs</strong> if 95%+
                  receipts are via online/banking channels like UPI/NEFT).
                </li>
                <li>
                  • <strong>Presumptive Profit:</strong> Declare minimum <strong>50% of gross receipts</strong> as your
                  net taxable profit.
                </li>
                <li>
                  • <strong>Books Relief:</strong> No requirement to maintain detailed books of accounts u/s 44AA.
                </li>
                <li>
                  • <strong>No Tax Audit:</strong> Completely exempt from CA audit under Section 44AB.
                </li>
                <li>
                  • <strong>Advance Tax:</strong> Single installment on or before <strong>March 15</strong>!
                </li>
                <li>
                  • <strong>ITR Form:</strong> File <strong>ITR-4 (Sugam)</strong>.
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <div className="font-semibold text-violet-600 dark:text-violet-400 mb-1">
                Section 44AD (For Traders & Contractors)
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Eligible: Retailers, suppliers of goods, transport contractors, wholesale traders.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  • <strong>Turnover Limit:</strong> Up to ₹2 Crore (or <strong>₹3 Crore</strong> if 95%+ receipts are
                  digital).
                </li>
                <li>
                  • <strong>Presumptive Profit:</strong> <strong>6%</strong> for turnover received digitally (bank/UPI),{' '}
                  <strong>8%</strong> for cash turnover.
                </li>
                <li>
                  • <strong>Advance Tax:</strong> 100% due in single installment by <strong>March 15</strong>.
                </li>
                <li>
                  • <strong>ITR Form:</strong> File <strong>ITR-4 (Sugam)</strong>.
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <strong>Important Catch:</strong> If you opt for 44ADA/AD, all business deductions (hosting, phone, rent,
            depreciation) are deemed to have been already factored into the 50% / 6% profit margin! You cannot claim
            additional business deductions on top of the deemed profit.
          </div>
        </div>
      ),
    },
    {
      id: 'sec-advance-tax',
      title: 'Advance Tax Rules, Deadlines & Section 234C Penalties',
      badge: 'Deadlines',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: DollarSign,
      summary:
        'When you must pay advance tax to avoid 1% monthly interest penalties under Section 234B and 234C.',
      content: (
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Under Section 208 of the Income Tax Act, if your estimated total income tax liability for the financial year
            (after deducting TDS) is <strong>₹10,000 or more</strong>, you are legally required to pay tax in advance.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="p-2.5">Due Date</th>
                  <th className="p-2.5">Regular Business / ITR-3</th>
                  <th className="p-2.5">Presumptive 44ADA / 44AD (ITR-4)</th>
                  <th className="p-2.5">Delay Penalty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                <tr>
                  <td className="p-2.5 font-medium">15th June</td>
                  <td className="p-2.5">15% of annual tax</td>
                  <td className="p-2.5 text-emerald-600 font-medium">NIL (Exempt)</td>
                  <td className="p-2.5 text-rose-500">1% per month (Sec 234C)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">15th September</td>
                  <td className="p-2.5">45% cumulative</td>
                  <td className="p-2.5 text-emerald-600 font-medium">NIL (Exempt)</td>
                  <td className="p-2.5 text-rose-500">1% per month (Sec 234C)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">15th December</td>
                  <td className="p-2.5">75% cumulative</td>
                  <td className="p-2.5 text-emerald-600 font-medium">NIL (Exempt)</td>
                  <td className="p-2.5 text-rose-500">1% per month (Sec 234C)</td>
                </tr>
                <tr className="bg-amber-500/10 font-medium">
                  <td className="p-2.5">15th March</td>
                  <td className="p-2.5">100% of tax</td>
                  <td className="p-2.5 text-amber-600 font-bold">100% of tax (Single Payment!)</td>
                  <td className="p-2.5 text-rose-500">1% per month (Sec 234B & 234C)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <strong>How to Pay Advance Tax:</strong> Visit{' '}
            <a
              href="https://eportal.incometax.gov.in"
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 underline inline-flex items-center gap-1 font-medium"
            >
              e-Filing Portal &gt; e-Pay Tax <ExternalLink className="w-3 h-3" />
            </a>
            , select <strong>Assessment Year 2027-28</strong>, Type of Payment: <strong>Advance Tax (100)</strong>, and
            pay via SBI Net Banking or UPI. Keep the BSR Code and Challan Serial Number for your return!
          </div>
        </div>
      ),
    },
    {
      id: 'sec-cash-traps',
      title: 'Cash Traps: Section 40A(3), Section 269ST & Section 270A',
      badge: 'Audit Red Flags',
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      icon: Flame,
      summary:
        'The critical cash thresholds that trigger automatic IT department scrutiny and 100% expense disallowance.',
      content: (
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <h5 className="font-semibold text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                1. Section 40A(3): The ₹10,000 Single Cash Payment Disallowance
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                If you pay more than <strong>₹10,000 in cash</strong> in a single day to any person/vendor for a business
                expense, the <strong>ENTIRE payment is disallowed</strong> as a deduction from your income.
                <br />
                <em>Example:</em> You bought office supplies worth ₹12,000 and paid in cash. Tax impact: ₹0 allowed as
                business deduction. If you had paid ₹12,000 via SBI UPI or debit card, the full ₹12,000 would be allowed.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <h5 className="font-semibold text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                2. Section 269ST: Prohibition on Receiving ₹2,00,000 or More in Cash
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                No person can receive <strong>₹2 Lakhs or more in cash</strong> from a single person in a day or in respect
                of a single invoice/event. Penalty under Section 271DA is <strong>100% of the cash received</strong>! Never
                accept client invoice payments in cash exceeding ₹2L.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <h5 className="font-semibold text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                3. Section 270A: Underreporting & Misreporting Penalties
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                If you claim personal expenses (like personal jewellery, home groceries, or unverified cash) as business
                deductions to artificially lower your taxable income, the assessing officer can slap a{' '}
                <strong>penalty equal to 200% of the tax evaded</strong> under Section 270A(9).
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'sec-gst-jharkhand',
      title: 'GST & Jharkhand State Specifics (Professional Tax & MSME)',
      badge: 'State & GST',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      icon: Scale,
      summary:
        'GST registration thresholds, Letter of Undertaking (LUT) for foreign clients, and Jharkhand Professional Tax compliance.',
      content: (
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <h5 className="font-semibold text-slate-900 dark:text-white mb-2">GST Thresholds for Jharkhand</h5>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  • <strong>Services:</strong> Mandatory registration only if aggregate annual turnover exceeds{' '}
                  <strong className="text-blue-500">₹20 Lakhs</strong>.
                </li>
                <li>
                  • <strong>Exclusive Goods:</strong> Registration threshold is{' '}
                  <strong className="text-blue-500">₹40 Lakhs</strong> (intra-state).
                </li>
                <li>
                  • <strong>Export of Services:</strong> If you serve foreign clients, exports are "Zero-rated". You can
                  file a <strong>Letter of Undertaking (LUT - Form RFD-11)</strong> annually on the GST portal to export
                  services without paying IGST upfront!
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <h5 className="font-semibold text-slate-900 dark:text-white mb-2">
                Jharkhand Professional Tax (PT Act, 2011)
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                In Jharkhand, every individual carrying on a profession or trade must hold a Certificate of Enrolment
                (Form I) and pay annual PT:
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>• Income up to ₹3,00,000: <strong>NIL</strong></li>
                <li>• Income ₹3,00,001 to ₹5,00,000: <strong>₹1,200/year</strong></li>
                <li>• Income ₹5,00,001 to ₹10,00,000: <strong>₹1,800/year</strong></li>
                <li>• Income above ₹10,00,000: <strong>₹2,500/year (Maximum statutory cap)</strong></li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <h6 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
              Your MSME Udyam Registration (UDYAM-JH-06-0090498) Protections:
            </h6>
            <p className="text-slate-600 dark:text-slate-400">
              Under Sections 15 & 16 of the MSMED Act, clients are legally obligated to pay your invoices within a{' '}
              <strong>maximum of 45 days</strong>. If a buyer delays payment beyond 45 days, they must pay compound
              interest with monthly rests at <strong>three times the RBI bank rate</strong>. Furthermore, Section 43B(h) of
              the Income Tax Act disallows their expense deduction if they don't pay you on time!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'sec-ais-26as',
      title: 'AIS / TIS & Form 26AS: How the Tax Department Watches You',
      badge: 'Scrutiny Defense',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      icon: Info,
      summary:
        'How to verify your Annual Information Statement (AIS) so you never get an automated Section 143(1) mismatch notice.',
      content: (
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Gone are the days when tax authorities relied solely on self-declared figures. The Income Tax Department now
            receives real-time data feeds through the <strong>Annual Information Statement (AIS)</strong> and{' '}
            <strong>Taxpayer Information Summary (TIS)</strong>.
          </p>

          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <strong className="text-slate-900 dark:text-white block mb-1">1. Form 26AS</strong>
              <p className="text-slate-500">
                Shows all TDS deducted by your clients (e.g. 194J @ 10% or 194C @ 1%). Verify that all TDS credits match
                your invoiced amounts.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <strong className="text-slate-900 dark:text-white block mb-1">2. AIS / SFT Feeds</strong>
              <p className="text-slate-500">
                Shows Current Account cash deposits & withdrawals reported by SBI, interest on savings accounts, stock/crypto
                trades, and credit card payments.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <strong className="text-slate-900 dark:text-white block mb-1">3. Automated Matching</strong>
              <p className="text-slate-500">
                If turnover declared in ITR is LESS than the credits in AIS or 26AS, an automated defect notice under
                Section 139(9) or 143(1)(a) is automatically triggered.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
            <strong>Best Practice Checklist Before Filing ITR:</strong>
            <ol className="list-decimal list-inside mt-1.5 space-y-1 text-slate-700 dark:text-slate-300">
              <li>Log in to eportal.incometax.gov.in and download your AIS and Form 26AS.</li>
              <li>Reconcile SBI Current Account turnover with the Gross Revenue in this app.</li>
              <li>Ensure your claimed business deductions only include Section 37 items, keeping drawings segregated.</li>
              <li>Pay all remaining advance tax before March 15 to avoid Section 234B/C interest.</li>
            </ol>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = guideSections.filter((sec) => {
    return (
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tax rules (e.g., 44ADA, drawings, cash limit, SFT, advance tax)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>

      {/* Guide Cards Accordion */}
      <div className="space-y-4">
        {filteredSections.map((sec) => {
          const isExpanded = expandedId === sec.id;
          const Icon = sec.icon;

          return (
            <div
              key={sec.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? 'border-amber-500/30 bg-white dark:bg-slate-900 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <button
                onClick={() => toggleExpand(sec.id)}
                className="w-full text-left p-5 flex items-start justify-between gap-4 cursor-pointer focus:outline-none"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isExpanded
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-base text-slate-900 dark:text-white">
                        {sec.title}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${sec.badgeColor}`}>
                        {sec.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {sec.summary}
                    </p>
                  </div>
                </div>
                <div className="text-slate-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in-50 duration-200">
                  {sec.content}
                </div>
              )}
            </div>
          );
        })}

        {filteredSections.length === 0 && (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              No tax guides matched "{searchQuery}"
            </p>
            <p className="text-xs text-slate-400 mt-1">Try searching for "44ADA", "cash", "drawings", or "advance tax"</p>
          </div>
        )}
      </div>
    </div>
  );
};
