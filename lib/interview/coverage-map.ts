import { Language } from './types';

export interface FieldDefinition {
  id: string;
  required: boolean;
  priority: number; // lower = ask sooner
  section: string;
  question: Record<Language, string>;
  followUpQuestion?: Record<Language, string>;
  inputType: 'text' | 'number' | 'select' | 'table' | 'file';
}

export const coverageMap: FieldDefinition[] = [
  // ── Section 1.1: Company Profile ──────────────────────────────────────────
  {
    id: 'company_profile.company_name',
    required: true,
    priority: 1,
    section: '1.1',
    inputType: 'text',
    question: {
      en: 'To start, what is the name of your company?',
      am: 'ለመጀመር፣ የኩባንያዎ ስም ምንድን ነው?',
      om: 'Jalqabuuf, maqaan dhaabbata keessanii maali?',
    },
  },
  {
    id: 'company_profile.business_type',
    required: true,
    priority: 2,
    section: '1.1',
    inputType: 'text',
    question: {
      en: 'What type of business do you run? (e.g. textile, leather, food processing, metal works, agriculture, service)',
      am: 'ምን ዓይነት ንግድ ነው የሚሠሩት? (ለምሳሌ ጨርቅ፣ ቆዳ፣ ምግብ ማምረት፣ ብረት ሥራ፣ ግብርና፣ አገልግሎት)',
      om: 'Gosa daldalaa maal hojjetta? (fkn, suufi, gogaa, nyaata oomishuu, simbirroo, qonnaa, tajaajila)',
    },
  },
  {
    id: 'company_profile.years_in_operation',
    required: true,
    priority: 3,
    section: '1.1',
    inputType: 'number',
    question: {
      en: 'How many years has your business been operating?',
      am: 'ንግድዎ ለምን ያህል ዓመት ሲሠራ ቆይቷል?',
      om: 'Daldalli keessan waggaa meeqa tajaajilaa jira?',
    },
    followUpQuestion: {
      en: 'When you say the business has been running for that long, can you tell me roughly what year it was registered or officially started?',
      am: 'ንግድዎ ለዚያ ያህል ጊዜ ሲሠራ ቆይቷል ሲሉ፣ ምን ዓመት ገደማ እንደተመዘገበ ወይም በይፋ እንደተጀመረ ሊነግሩኝ ይቻሉ?',
      om: 'Daldalli waggaa sanaa olii tajaajilaa jira yoo jettu, waggaa kamitti galmaayee ykn officially eegale nutti himuu dandeessaa?',
    },
  },
  {
    id: 'company_profile.business_registration_number',
    required: true,
    priority: 4,
    section: '1.1',
    inputType: 'text',
    question: {
      en: 'What is your business registration number? (You can find this on your trade licence)',
      am: 'የንግድ ምዝገባ ቁጥርዎ ምንድን ነው? (በንግድ ፈቃድዎ ላይ ያገኙታል)',
      om: 'Lakkoofsi galmee daldalaa keessanii maali? (Hayyama daldalaa keessan irratti argachuu dandeessu)',
    },
  },
  {
    id: 'company_profile.address',
    required: true,
    priority: 5,
    section: '1.1',
    inputType: 'text',
    question: {
      en: 'Where is your business located? (City and region)',
      am: 'ንግድዎ የሚገኘው የት ነው? (ከተማ እና ክልል)',
      om: 'Daldalli keessan eessa argama? (Magaalaa fi naannoo)',
    },
  },
  {
    id: 'company_profile.mobile_number',
    required: true,
    priority: 6,
    section: '1.1',
    inputType: 'text',
    question: {
      en: 'What is your mobile phone number? (Include country code, e.g. +251...)',
      am: 'የሞባይል ስልክ ቁጥርዎ ምንድን ነው? (የሀገር ኮድ ጨምሮ፣ ለምሳሌ +251...)',
      om: 'Lakkoofsi bilbila gara keessanii maali? (Koodii biyyaa dabalatee, fkn +251...)',
    },
  },
  {
    id: 'company_profile.ownership_percentage.women_pct',
    required: true,
    priority: 7,
    section: '1.1',
    inputType: 'number',
    question: {
      en: 'What percentage of your company is owned by women? (0-100%)',
      am: 'ከኩባንያዎ ባለቤትነት ስንት በመቶ በሴቶች ይያዛል? (0-100%)',
      om: 'Dhibbantaan qabiyyee dhaabbata keessanii meeqatu dubartootaan qabama? (0-100%)',
    },
  },

  // ── Section 1.2: Growth Indicators ────────────────────────────────────────
  {
    id: 'growth_indicators',
    required: false,
    priority: 8,
    section: '1.2',
    inputType: 'table',
    question: {
      en: 'Please provide your sales and employee numbers for 2022, 2023, and 2024.',
      am: 'እባክዎ ለ2022፣ 2023 እና 2024 የሽያጭ እና የሰራተኛ ቁጥሮችን ያቅርቡ።',
      om: 'Lakkoofsota gurgurtaa fi hojjettoota 2022, 2023, fi 2024 irratti kennuu dandaʼu?',
    },
    followUpQuestion: {
      en: 'The numbers you provided for growth indicators seem inconsistent. Can you explain?',
      am: 'የሰጡት የሽያጭ እና የሰራተኛ ቁጥሮች ወጥነት የሌላቸው ይመስላሉ። ማብራራት ይችላሉ?',
      om: 'Lakkoofsota gurgurtaa kennitan wal faallessa fakkaata. Ibsuu dandeessu?',
    },
  },
  {
    id: 'growth_indicators.total_employees.2024',
    required: true,
    priority: 9,
    section: '1.2',
    inputType: 'number',
    question: {
      en: 'How many total employees did your business have in 2024?',
      am: 'ንግድዎ በ2024 ዓ.ም ስንት ሰራተኞች ነበሩት?',
      om: 'Bara 2024 daldalli keessan hojjettota meeqa qabaate?',
    },
  },
  {
    id: 'growth_indicators.female_employees.2024',
    required: true,
    priority: 10,
    section: '1.2',
    inputType: 'number',
    question: {
      en: 'Of your 2024 employees, how many were women?',
      am: 'ከ2024 ሠራተኞችዎ ውስጥ ስንቶቹ ሴቶች ናቸው?',
      om: 'Hojjettota bara 2024 keessaa meeqatu dubartii?',
    },
  },
  {
    id: 'growth_indicators.youth_employees_18_24.2024',
    required: true,
    priority: 11,
    section: '1.2',
    inputType: 'number',
    question: {
      en: 'How many of your 2024 employees were youth (aged 18–24 years)?',
      am: 'ከ2024 ሠራተኞችዎ ውስጥ ስንቶቹ ወጣቶች (ከ18-24 ዓመት) ነበሩ?',
      om: 'Hojjettota bara 2024 keessaa meeqatu dargaggoo (waggaa 18-24) ture?',
    },
  },
  {
    id: 'growth_indicators.sales_etb.2024',
    required: true,
    priority: 12,
    section: '1.2',
    inputType: 'number',
    question: {
      en: 'What were your total sales in Ethiopian Birr (ETB) in 2024? (Approximate is fine)',
      am: 'ጠቅላላ ሽያጭዎ ለ2024 ዓ.ም ስንት ብር ነበር? (ግምታዊ ቁጥር ይሆናል)',
      om: 'Gurgurtaan keessan bara 2024 Birrii Itoophiyaa meeqa ture? (Tilmaama gaarii)',
    },
  },
  {
    id: 'growth_indicators.sales_etb.2023',
    required: true,
    priority: 13,
    section: '1.2',
    inputType: 'number',
    question: {
      en: 'What were your total sales in 2023 (in ETB)?',
      am: 'ጠቅላላ ሽያጭዎ ለ2023 ዓ.ም ስንት ብር ነበር?',
      om: 'Gurgurtaan keessan bara 2023 Birrii Itoophiyaa meeqa ture?',
    },
  },
  {
    id: 'growth_indicators.sales_etb.2022',
    required: true,
    priority: 14,
    section: '1.2',
    inputType: 'number',
    question: {
      en: 'And your 2022 sales (in ETB)?',
      am: 'እና ለ2022 ዓ.ም ሽያጭዎ (በብር)?',
      om: 'Fi gurgurtaa bara 2022 keessan (Birriitti)?',
    },
    followUpQuestion: {
      en: 'Your sales figures seem to show a decline — is there a particular reason sales went down in a certain year? Understanding this helps us tell the full story of your business.',
      am: 'የሽያጭ ቁጥሮቹ ማሽቆልቆልን ሊያሳዩ ይችላሉ — የሽያጩ ማሽቆልቆሉ ምክንያት ነበር? ይህ የኩባንያዎን ሙሉ ታሪክ ለማቅረብ ይረዳናል።',
      om: 'Lakkoofsota gurgurtaa keessanii hir\'ina agarsiisu — sababni hir\'inni gurgurtaa sanaa yoo jiraate maal? Kun seenaa daldala keessanii guutuuf nu gargaara.',
    },
  },
  {
    id: 'growth_indicators.sales_etb.2025_projection',
    required: false,
    priority: 15,
    section: '1.2',
    inputType: 'number',
    question: {
      en: 'What is your projected sales for 2025 (in ETB)? This is your estimate/forecast.',
      am: 'ለ2025 ዓ.ም የሚጠበቀው ሽያጭ ስንት ነው? ይህ ግምትዎ/ትንበያዎ ነው።',
      om: 'Gurgurtaa bara 2025 tilmaamtu meeqa (Birriitti)? Kun tilmaama/raagduu keessaniti.',
    },
  },

  // ── Section 1.2: Company Overview ─────────────────────────────────────────
  {
    id: 'company_overview.development_since_start',
    required: true,
    priority: 16,
    section: '1.2',
    inputType: 'text',
    question: {
      en: 'How has your business grown or changed since you started? Tell me about your journey.',
      am: 'ከተጀመረ ጀምሮ ንግድዎ እንዴት አደገ ወይም ተለወጠ? ስለ ጉዞዎ ይንገሩኝ።',
      om: 'Daldalli keessan jalqaba irraa eegalee akkamitti guddatee ykn jijjiirameera? Imalaa keessan natti himaa.',
    },
  },
  {
    id: 'company_overview.product_service_uniqueness',
    required: true,
    priority: 17,
    section: '1.2',
    inputType: 'text',
    question: {
      en: 'What makes your product or service unique or different from others in the market?',
      am: 'ምርትዎ ወይም አገልግሎትዎ ከሌሎቹ ተወዳዳሪዎች ምን ያለ የተለየ ባህሪ አለው?',
      om: 'Meeshaa ykn tajaajila keessan, yeroo biraa gatii gurgurtaa irratti waan adda inni baasu maali?',
    },
  },

  // ── Section 1.7: Raw Materials ─────────────────────────────────────────────
  {
    id: 'company_overview.raw_material_sourcing_pct_local',
    required: false,
    priority: 18,
    section: '1.7',
    inputType: 'number',
    question: {
      en: 'Roughly what percentage of your raw materials do you source locally within Ethiopia? (0-100%, or skip if not applicable)',
      am: 'ጥሬ ዕቃዎችዎ ምን ያህሉ (%) ከኢትዮጵያ ውስጥ ይገኛሉ? (0-100%፣ ወይም ካልተገናኘ ይዝለሉ)',
      om: 'Dhibbantaan qabeenya keessan kallattii biyyaa Ethiopia irraa meeqa argatta? (0-100%, yookaan dirqama yoo hin taane ceesisaa)',
    },
  },

  // ── Section 1.5: Market ────────────────────────────────────────────────────
  {
    id: 'company_overview.market_overview',
    required: true,
    priority: 19,
    section: '1.5',
    inputType: 'text',
    question: {
      en: 'Who are your main customers and what markets do you serve? (Local, national, or export?)',
      am: 'ዋናዎቹ ደንበኞችዎ እነማን ናቸው እና የትኛው ገበያ ያገለግላሉ? (አካባቢ፣ ሀገር ወይም ወደ ውጭ ላክ?)',
      om: 'Maamiltonni keessan gurguddoon eenyu fi gabaa meeqa tajaajiltu? (Naannoo, biyyaa, ykn erga?)',
    },
  },

  // ── Section 1.3: Motivation ────────────────────────────────────────────────
  {
    id: 'company_overview.motivation_to_apply',
    required: true,
    priority: 20,
    section: '1.3',
    inputType: 'text',
    question: {
      en: 'Why are you applying for this support program? What do you hope to achieve with the funding?',
      am: 'ለምን ለዚህ ድጋፍ ፕሮግራም ያመለክታሉ? በፋይናንሱ ምን ለማሳካት ተስፋ ያደርጋሉ?',
      om: 'Maaliif sagantaa deggersaa kana irratti galmoofta? Maallaqa sanaan maal galma gahuuf abdattu?',
    },
  },

  // ── Section 2.1: Problem ───────────────────────────────────────────────────
  {
    id: 'intervention_requested.problem_to_be_addressed',
    required: true,
    priority: 21,
    section: '2.1',
    inputType: 'text',
    question: {
      en: 'What is the main business problem or challenge you want this support to help solve?',
      am: 'ይህ ድጋፍ ምን ዋናውን የንግድ ችግር ወይም ፈተና እንዲፈታ ይፈልጋሉ?',
      om: 'Rakkoo ykn dhibdee daldalaa hangamii deggersaan kun furamuuf barbaaddu maali?',
    },
  },
  {
    id: 'intervention_requested.expected_results',
    required: true,
    priority: 22,
    section: '2.4',
    inputType: 'text',
    question: {
      en: 'If you receive this support, what specific results do you expect? What would improve?',
      am: 'ይህን ድጋፍ ካገኙ፣ ምን ልዩ ውጤቶችን ይጠብቃሉ? ምን ይሻሻላል?',
      om: 'Deggersaa kana yoo argattan, bu\'aa maalifaa eegtu? Maal fooyyofa?',
    },
  },
  {
    id: 'intervention_requested.job_creation.explanation',
    required: true,
    priority: 23,
    section: '2.5',
    inputType: 'text',
    question: {
      en: 'If you receive this support, how many new jobs do you expect to create over the next 15 months? What types of positions?',
      am: 'ይህን ድጋፍ ካገኙ፣ ባለፉት 15 ወራት ስንት አዲስ የሥራ ቦታዎች ይፈጥራሉ? ምን ዓይነት ቦታዎች?',
      om: 'Deggersaa kana yoo argattan, ji\'a 15 itti aanoo hojii haaraa meeqa uumuu eegtu? Gosa hojii maalifaa?',
    },
  },
  {
    id: 'intervention_requested.social_environmental_impact_osh',
    required: true,
    priority: 24,
    section: '2.6',
    inputType: 'text',
    question: {
      en: 'Does your business have any positive social or environmental impact? For example, do you use eco-friendly practices, employ women/youth, or benefit the local community?',
      am: 'ንግድዎ አዎንታዊ ማህበራዊ ወይም አካባቢያዊ ተጽዕኖ አለው? ለምሳሌ፣ ወዳጃዊ ልምዶችን ይጠቀማሉ፣ ሴቶችን/ወጣቶችን ይቀጥራሉ፣ ወይም ለአካባቢ ማህበረሰብ ጠቃሚ ናቸው?',
      om: 'Daldalli keessan faayidaa hawaasaa ykn naannoo qaba? Fkn, hojmaata sirnaa fayyadamtu, dubartii/dargaggoo bobbaastu, ykn hawaasa naannoo gargaartu?',
    },
  },
  {
    id: 'company_profile.business_organization_form',
    required: false,
    priority: 25,
    section: '1.1',
    inputType: 'select',
    question: {
      en: 'What is the legal form of your business? (Sole Proprietorship, Private Limited Company, Share Company, or Other)',
      am: 'ንግድዎ ምን ዓይነት ህጋዊ መዋቅር አለው? (ብቸኛ ባለቤትነት፣ የግል ኃ/የ/ማ.፣ ድርሻ ኩባንያ፣ ወይም ሌላ)',
      om: 'Miidhaginni seeraa daldala keessanii maalfaa? (Qabeenyaa namoota tokkoo, Dhaabbata Daangeffame, Dhaabbata Hissaa, ykn Kan biraa)',
    },
  },
];