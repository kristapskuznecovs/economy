import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeEuro,
  BriefcaseBusiness,
  Building2,
  FileBarChart2,
  Scale,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MigrationOverviewCard } from '@/components/MigrationOverviewCard';
import { useI18n, type Locale } from '@/lib/i18n';

type SourceMeta = {
  label: string;
  url: string;
};

type SnapshotCard = {
  label: string;
  value: string;
  detail: string;
  source: SourceMeta;
};

type SafetyMetric = {
  label: string;
  value: string;
  detail: string;
  source: SourceMeta;
};

type TrendPoint = {
  year: string;
  value: number;
  detail: string;
  source: SourceMeta;
};

type InstitutionLoad = {
  key: 'pmlp' | 'police' | 'courts' | 'csdd';
  label: string;
  ratioPer10k: number;
  annualCostPerFteEur: number;
  detail: string;
  sourceType: 'observed_signal' | 'modeled_assumption';
};

type SkillProfile = 'low' | 'mixed' | 'high';

type SectorMix = {
  label: string;
  value: number;
};

type BeneficiaryItem = {
  title: string;
  detail: string;
  source: SourceMeta;
};

type LabourSlackMetric = {
  label: string;
  value: string;
  detail: string;
  source: SourceMeta;
};

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  chips: string[];
  snapshotCards: SnapshotCard[];
  safetyTitle: string;
  safetySubtitle: string;
  safetyMetrics: SafetyMetric[];
  trendTitle: string;
  trendSubtitle: string;
  trendSeries: TrendPoint[];
  scenarioTitle: string;
  scenarioSubtitle: string;
  arrivalsLabel: string;
  arrivalsHelp: string;
  skillLabel: string;
  skillOptions: Record<SkillProfile, string>;
  fiscalTitle: string;
  fiscalSubtitle: string;
  jobsTitle: string;
  jobsSubtitle: string;
  beneficiariesTitle: string;
  beneficiariesSubtitle: string;
  beneficiaries: BeneficiaryItem[];
  labourSlackTitle: string;
  labourSlackSubtitle: string;
  labourSlackMetrics: LabourSlackMetric[];
  unemploymentTitle: string;
  unemploymentBody: string;
  unemploymentTag: string;
  institutionsTitle: string;
  institutionsSubtitle: string;
  institutions: InstitutionLoad[];
  modeledTag: string;
  observedTag: string;
  evidenceTitle: string;
  evidenceBody: string;
  secondaryInstitutionsTitle: string;
  secondaryInstitutionsSubtitle: string;
  csddTitle: string;
  csddBody: string;
  csddTag: string;
  municipalPoliceTitle: string;
  municipalPoliceBody: string;
  municipalPoliceTag: string;
  roadPoliceTitle: string;
  roadPoliceBody: string;
  roadPoliceTag: string;
  pvdTitle: string;
  pvdBody: string;
  pvdTag: string;
  ptacTitle: string;
  ptacBody: string;
  ptacTag: string;
  ngoTitle: string;
  ngoBody: string;
  ngoTag: string;
  universitiesTitle: string;
  universitiesBody: string;
  universitiesTag: string;
  housingTitle: string;
  housingBody: string;
  housingTag: string;
  socialHousingTitle: string;
  socialHousingBody: string;
  socialHousingTag: string;
  healthcareTitle: string;
  healthcareBody: string;
  healthcareTag: string;
  vidTitle: string;
  vidBody: string;
  vidTag: string;
  transportTitle: string;
  transportBody: string;
  transportTag: string;
  enclaveTitle: string;
  enclaveBody: string;
  enclaveTag: string;
  hospitalTitle: string;
  hospitalBody: string;
  hospitalTag: string;
  labourTitle: string;
  labourBody: string;
  labourTag: string;
  incomeFloorTitle: string;
  incomeFloorBody: string;
  incomeFloorTag: string;
  educationTitle: string;
  educationBody: string;
  educationTag: string;
  wasteTitle: string;
  wasteBody: string;
  wasteTag: string;
  comparativeRiskTitle: string;
  comparativeRiskBody: string;
  comparativeRiskTag: string;
  swedenInstitutionsTitle: string;
  swedenInstitutionsSubtitle: string;
  swedenInstitutions: string[];
  swedenInstitutionsTag: string;
  honestyTitle: string;
  honestyBody: string;
  assumptionsTitle: string;
  assumptions: string[];
  sourceLabel: string;
  firstYearNet: string;
  taxTake: string;
  serviceCost: string;
  workParticipation: string;
  estimatedWorkers: string;
  typicalJobs: string;
  extraBudget: string;
  extraFte: string;
};

const COMMON_SOURCES = {
  pmlpStats: {
    label: 'PMLP statistika / pmlp.gov.lv',
    url: 'https://www.pmlp.gov.lv/lv/statistika-uzturesanas-atlaujas-2024-gads',
  },
  pmlpStats2025: {
    label: 'PMLP statistika 2025 / pmlp.gov.lv',
    url: 'https://www.pmlp.gov.lv/lv/statistika-uzturesanas-atlaujas-2025-gads',
  },
  eu: {
    label: 'EU / Integration factsheet',
    url: 'https://home-affairs.ec.europa.eu/system/files/2024-11/latvia_en.pdf',
  },
  oecd2024: {
    label: 'OECD 2024',
    url: 'https://www.oecd.org/en/publications/international-migration-outlook-2024_50b0353e-en/full-report/latvia_dc364075.html',
  },
  oecd2025: {
    label: 'OECD 2025',
    url: 'https://www.oecd.org/en/publications/2025/11/international-migration-outlook-2025_355ae9fd/full-report/latvia_ff67aa3d.html',
  },
  oecdFiscal: {
    label: 'OECD fiscal evidence',
    url: 'https://www.oecd.org/migration/is-migration-good-for-the-economy-9789264288737-en.htm',
  },
  oecdWages: {
    label: 'OECD wage-entry evidence',
    url: 'https://www.oecd.org/en/publications/how-immigrants-fare-in-the-labour-market-results-from-a-new-longitudinal-approach_570f9954-en.html',
  },
  lsmPmlp: {
    label: 'LSM / PMLP',
    url: 'https://eng.lsm.lv/article/society/society/13.08.2024-number-of-foreign-workers-in-latvia-increases.a564960/',
  },
  pmlpUkraine: {
    label: 'PMLP 2025',
    url: 'https://www.pmlp.gov.lv/en/article/office-citizenship-and-migration-affairs-continues-accept-applications-extension-temporary-protection-status-ukrainian-civilians',
  },
  lsmExpiry: {
    label: 'LSM 2025',
    url: 'https://eng.lsm.lv/article/society/society/12.03.2025-around-4000-russian-citizens-latvian-residence-permits-expire-this-year.a591323/',
  },
  emShortages: {
    label: 'Economics Ministry 2023',
    url: 'https://www.em.gov.lv/en/article/requirements-attracting-foreign-employees-work-latvia-unregulated-professions-have-been-eased',
  },
  csddForeignLicence: {
    label: 'CSDD foreign licence rules',
    url: 'https://www.csdd.lv/driver/use-of-foreign-driving-licence/',
  },
  csddLicenceExchange: {
    label: 'CSDD licence exchange',
    url: 'https://www.csdd.lv/en/exchange-of-driver-s-license/exchange-of-a-license-issued-abroad',
  },
  csddThirdCountryVehicle: {
    label: 'CSDD third-country vehicle declaration',
    url: 'https://www.csdd.lv/en/for-the-travellers-from-the-countries-of-the-european-union/declaration-of-vehicles-registered-in-third-countries/',
  },
  lsmUkraineLicence: {
    label: 'LSM / Latvia-Ukraine licence recognition',
    url: 'https://eng.lsm.lv/article/economy/transport/28.01.2026-latvia-ukraine-will-mutually-recognise-drivers-licenses.a631923/',
  },
  lsmRigaIllegalParking: {
    label: 'LSM / illegal parking and towing in Riga',
    url: 'https://eng.lsm.lv/article/society/society/28.01.2025-riga-municipal-police-to-increase-fines-for-illegal-parking.a586039/',
  },
  lsmForeignVehiclesPunished: {
    label: 'LSM / foreign vehicles enforcement',
    url: 'https://eng.lsm.lv/article/economy/transport/08.08.2025-violations-by-foreign-vehicles-now-more-likely-to-be-punished-in-latvia.a609661/',
  },
  mfaThirdCountryVehicles: {
    label: 'MFA / third-country vehicle declaration rule',
    url: 'https://www.mfa.gov.lv/en/article/road-traffic-safety-directorate-informs-vehicles-registered-third-country-will-have-be-declared-use-road-traffic-latvia-1-january-2025',
  },
  lsmPvdCouriers: {
    label: 'LSM / PVD courier register',
    url: 'https://eng.lsm.lv/article/society/society/12.02.2025-food-courier-register-shows-some-without-residence-permits-in-latvia.a587461/',
  },
  lsmPvdInspections: {
    label: 'LSM / PVD courier inspections',
    url: 'https://eng.lsm.lv/article/culture/food-drink/30.07.2025-latvians-dont-complain-about-food-couriers-says-authority.a608546/',
  },
  pvdFoodRegister: {
    label: 'PVD food undertaking registration',
    url: 'https://www.pvd.gov.lv/en/services/registration-or-recognition-food-undertaking',
  },
  dwBkaSexualViolence: {
    label: 'DW summary of BKA 2024 stats',
    url: 'https://www.dw.com/en/germany-sees-rise-in-sexual-violence-and-youth-offenses/a-72116932',
  },
  oecdGermanyForeignBorn: {
    label: 'OECD Germany foreign-born share',
    url: 'https://www.oecd.org/en/publications/2025/11/international-migration-outlook-2025_355ae9fd/full-report/germany_8ad94e8b.html',
  },
  braCrimePrevention: {
    label: 'Brå municipal crime prevention',
    url: 'https://bra.se/english/crime-prevention',
  },
  nlDomesticViolence: {
    label: 'Dutch government domestic violence',
    url: 'https://www.government.nl/topics/domestic-violence/tackling-domestic-violence',
  },
  lsmMurders2024: {
    label: 'LSM / murders in 2024',
    url: 'https://eng.lsm.lv/article/society/crime/24.02.2025-latvia-had-67-murder-victims-in-2024.a588980/',
  },
  lsmDomesticReports2023: {
    label: 'LSM / domestic violence reports',
    url: 'https://eng.lsm.lv/article/society/crime/12.02.2024-number-of-domestic-violence-reports-doubled-last-year-in-latvia.a542564/',
  },
  lsmHomicideRate: {
    label: 'LSM / Eurostat homicide rate',
    url: 'https://eng.lsm.lv/article/society/crime/23.04.2025-latvia-retains-eus-highest-homicide-rate.a596277/',
  },
  lsmTrafficking2024: {
    label: 'LSM / trafficking cases',
    url: 'https://eng.lsm.lv/article/society/crime/29.01.2026-38-cases-of-human-trafficking-in-latvia-in-2024.a631619/',
  },
  lsmRefugeeSupport65m: {
    label: 'LSM / €65m refugee support plan',
    url: 'https://eng.lsm.lv/article/society/society/26.02.2025-latvia-to-continue-providing-support-to-ukrainian-refugees.a589409/',
  },
  esFondiSifAmif: {
    label: 'ES fondi / SIF AMIF project',
    url: 'https://www.esfondi.lv/en/about-eu-funds/news/from-support-to-belonging-strengthening-latvia-s-integration-system-with-the-support-of-the-eu-asylum-migration-and-integration-fund',
  },
  lsmZiedot: {
    label: 'LSM / Ziedot.lv €2.5m channelled',
    url: 'https://eng.lsm.lv/article/society/society/29.03.2023-eur-25-million-channeled-to-ukrainian-refugees-in-latvia-through-ziedotlv.a502816/',
  },
  lsmIllegalWaste: {
    label: 'LSM / illegal waste removal',
    url: 'https://eng.lsm.lv/article/society/environment/10.04.2025-daugavpils-spends-a-lot-on-illegal-waste-removal.a594918/',
  },
  vvdAsbestosScale: {
    label: 'VVD / hazardous waste scale',
    url: 'https://www.vvd.gov.lv/lv/jaunums/latvija-ir-apmeram-1-miljons-tonnu-azbestu-saturosa-sifera',
  },
  izmUkraineTeachers: {
    label: 'IZM / Ukrainian teachers in Latvia',
    url: 'https://www.izm.gov.lv/en/ukraine-latvia',
  },
  lsmUkrainianCamps: {
    label: 'LSM / Ukrainian children camps funding',
    url: 'https://eng.lsm.lv/article/society/society/16.04.2025-government-approves-eur900000-for-ukrainian-childrens-camps-in-latvia.a595682/',
  },
  lsmLatvianLessons: {
    label: 'LSM / Latvian lessons funding',
    url: 'https://eng.lsm.lv/article/society/education/19.04.2023-government-allocates-4-million-euros-to-latvian-language-lessons-for-ukrainians.a505403/',
  },
  lsmSchoolYear2025: {
    label: 'LSM / school year 2025 figures',
    url: 'https://eng.lsm.lv/article/society/education/01.09.2025-over-220-thousand-pupils-start-school-year-in-latvia.a612571/',
  },
  studyInLatviaBestPractice: {
    label: 'Study in Latvia / best practice universities',
    url: 'https://studyinlatvia.lv/article/news/latvian-universities-and-ministries-agree-on-good-practice-in-attracting-foreign-students-and-ensuring-studies',
  },
  lsmForeignStudentsRsu: {
    label: 'LSM / foreign students at RSU',
    url: 'https://eng.lsm.lv/article/society/education/02.09.2024-thousands-of-foreign-students-welcomed-at-latvian-universities.a567069/',
  },
  lsmStudentHousing: {
    label: 'LSM / student rent demand',
    url: 'https://eng.lsm.lv/article/society/society/student-influx-increases-demand-for-rent-apartments-in-riga.a200626/',
  },
  lsmHealthAndBenefits: {
    label: 'LSM / healthcare and benefits pressure',
    url: 'https://eng.lsm.lv/article/society/society/03.12.2025-ukrainian-aid-measures-to-be-cut-in-2026-in-latvia.a624881/',
  },
  lsmVidEconomicActivity: {
    label: 'LSM / VID economic activity registrations',
    url: 'https://eng.lsm.lv/article/society/society/26.02.2025-latvia-to-continue-providing-support-to-ukrainian-refugees.a589409/',
  },
  lsmRigaTransport2025: {
    label: 'LSM / Rīga public transport 2025',
    url: 'https://eng.lsm.lv/article/economy/transport/16.01.2026-rigas-public-transport-carried-1185-million-passengers-in-2025.a630244/',
  },
  emPtacBasket: {
    label: 'Economics Ministry / PTAC price basket monitoring',
    url: 'https://www.em.gov.lv/en/article/ptac-price-basket-becomes-more-affordable-consumers',
  },
  ptacFuelMonitoring: {
    label: 'PTAC / fuel-price monitoring',
    url: 'https://www.ptac.gov.lv/lv/jaunums/ptac-pastiprinati-uzraudzis-degvielas-mazumtirgotaju-praksi-un-aicina-pateretajus-zinot-par-aizdomigiem-cenu-kapumiem',
  },
  ptacConsumerProtection: {
    label: 'PTAC / consumer-protection mandate',
    url: 'https://www.ptac.gov.lv/en/consumer-protection',
  },
  csbUnemploymentQ12025: {
    label: 'CSB / unemployment in Q1 2025',
    url: 'https://stat.gov.lv/en/statistics-themes/labour-market/unemployment/press-releases/22891-unemployment-1st-quarter-2025',
  },
  csbEmployment2025: {
    label: 'CSB / employment and unemployment in 2025',
    url: 'https://stat.gov.lv/en/statistics-themes/labour-market/employment/press-releases/26607-employment-and-unemployment-4th?themeCode=NBBA',
  },
  csbPreRetirement: {
    label: 'CSB / pre-retirement age employment and inactivity',
    url: 'https://stat.gov.lv/lv/statistikas-temas/labklajibas-un-vienlidzibas-raditaji/sociala-ieklausanas/15386-sociala',
  },
};

const COPY: Record<Locale, Copy> = {
  lv: {
    eyebrow: 'TUA, darbs un budžeta slodze',
    title: 'Vienkāršs panels par to, ko migrācija dod un ko tā maksā',
    subtitle:
      'Ideja šeit nav moralizēt, bet parādīt mehānismu saprotami: cik cilvēku ienāk, kāda tipa darbos viņi, visticamāk, nonāk, cik liela ir pirmā gada fiskālā atdeve, un kādu papildu slodzi tas uzliek PMLP, policijai un tiesām.',
    chips: ['Scenāriji, nevis lozungi', 'Prasmes profils ir regulējams', 'Budžeta slodze balstīta uz pieņēmumiem'],
    snapshotCards: [
      {
        label: 'TUA krājums',
        value: '85 978',
        detail: 'Derīgas termiņuzturēšanās atļaujas Latvijā 2024. gada 31. decembrī. Avots: PMLP oficiālā statistika (XLSX).',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        label: 'Pirmreizējas TUA 2024',
        value: '15 807',
        detail: '2024. gadā pirmreizēji izsniegtās TUA: darbs 3 681, studijas 3 146, pagaidu aizsardzība (UA) 6 783, ģimene 530.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        label: 'Darba + ģimenes TUA',
        value: '26 200',
        detail: 'Derīgas TUA darba (18 820) un ģimenes (7 380) iemeslam 2024. gada 31. decembrī.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        label: 'Pagaidu aizsardzība (UA)',
        value: '32 365',
        detail: 'Ukrainas civiliedzīvotāji ar pagaidu aizsardzības TUA Latvijā 2024. gada 31. decembrī.',
        source: COMMON_SOURCES.pmlpStats,
      },
    ],
    safetyTitle: 'Sabiedriskās drošības KPI, ko skatīties',
    safetySubtitle:
      'Šie ir oficiāli vai publiski citēti Latvijā mērīti incidentu rādītāji, ko var izmantot kā bāzes uzraudzības paneli. Tie nav pierādījums migrācijas cēloņsakarībai, bet tie ir svarīgi sabiedriskās drošības signāli.',
    safetyMetrics: [
      {
        label: 'Slepkavību upuri 2024',
        value: '67',
        detail: '2024. gadā Latvijā reģistrēti 67 slepkavību upuri.',
        source: COMMON_SOURCES.lsmMurders2024,
      },
      {
        label: 'Slepkavības mēģinājumi 2024',
        value: '32',
        detail: 'Valsts policijas apkopojumā 2024. gadā bija 32 slepkavības mēģinājumi.',
        source: COMMON_SOURCES.lsmMurders2024,
      },
      {
        label: 'Draudi nogalināt / smagi kaitēt 2023',
        value: '214',
        detail: '2023. gadā šādu ziņojumu skaits gandrīz dubultojās salīdzinājumā ar 2022. gadu.',
        source: COMMON_SOURCES.lsmDomesticReports2023,
      },
      {
        label: 'Vajāšana 2023',
        value: '84',
        detail: '2023. gadā reģistrēti 84 vajāšanas gadījumi, salīdzinot ar 53 gadu iepriekš.',
        source: COMMON_SOURCES.lsmDomesticReports2023,
      },
      {
        label: 'Cilvēktirdzniecības gadījumi 2024',
        value: '38',
        detail: '2024. gadā Latvijā reģistrēti 38 cilvēktirdzniecības gadījumi.',
        source: COMMON_SOURCES.lsmTrafficking2024,
      },
      {
        label: 'Homicīdi 2023',
        value: '79',
        detail: 'Eurostat datos Latvija saglabāja augstāko slepkavību līmeni ES uz iedzīvotāju.',
        source: COMMON_SOURCES.lsmHomicideRate,
      },
    ],
    trendTitle: 'TUA pēc valsts',
    trendSubtitle:
      'Derīgas TUA gada 31. decembrī, pa izcelsmes valstīm. Nospied gadu, lai salīdzinātu.',
    trendSeries: [
      {
        year: '2021',
        value: 46572,
        detail: 'Derīgas TUA 31.12.2021.: darbs 17 285, ģimene 6 510, studijas 6 948.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        year: '2022',
        value: 56725,
        detail: 'Derīgas TUA 31.12.2022.: darbs 18 255, pagaidu aizsardzība (UA) 9 724, studijas 7 178.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        year: '2023',
        value: 76735,
        detail: 'Derīgas TUA 31.12.2023.: darbs 19 244, pagaidu aizsardzība (UA) 26 395, studijas 8 857.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        year: '2024',
        value: 85978,
        detail: 'Derīgas TUA 31.12.2024.: darbs 18 820, pagaidu aizsardzība (UA) 32 365, studijas 9 695, ģimene 7 380.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        year: '2025',
        value: 82605,
        detail: 'Derīgas TUA 31.12.2025.: darbs 18 672, pagaidu aizsardzība (UA) 30 200, studijas 10 010, ģimene 7 354.',
        source: COMMON_SOURCES.pmlpStats2025,
      },
    ],
    scenarioTitle: 'Scenāriju kalkulators',
    scenarioSubtitle:
      'Pavelc slīdni un paskaties, ko nozīmētu lielāka ieplūde. Tas nav “precīzs pravietojums”, bet saprotams modelis ar redzamiem pieņēmumiem.',
    arrivalsLabel: 'Jaunpienācēji gadā',
    arrivalsHelp: 'Scenārijs no 0 līdz 100 000 cilvēkiem gadā.',
    skillLabel: 'Prasmju profils',
    skillOptions: {
      low: 'Pārsvarā zemākas kvalifikācijas darbi',
      mixed: 'Jaukts profils',
      high: 'Vairāk kvalificētu darbinieku',
    },
    fiscalTitle: 'Pirmā gada fiskālais efekts',
    fiscalSubtitle:
      'Šis bloks rāda vienkāršu pirmā gada modeli: nodokļu pienesums, publisko pakalpojumu izmaksas un neto starpība.',
    jobsTitle: 'Kur viņi parasti nonāktu darbā',
    jobsSubtitle:
      'Latvijas Ekonomikas ministrijas darba tirgus signāli rāda pieprasījumu īpaši ražošanā un būvniecībā. Zemāk ir scenārija sadalījums, nevis oficiāla PMLP profesiju tabula.',
    beneficiariesTitle: 'Lielākie ieguvēji no migrācijas plūsmas',
    beneficiariesSubtitle:
      'Publiski pieejamie dati šobrīd ļauj droši identificēt nozares, nevis precīzu uzņēmumu topu. Šie ir sektori, kas visvairāk iegūst no papildu darbaspēka un studentu plūsmas.',
    beneficiaries: [
      {
        title: 'Transports un loģistika',
        detail: 'PMLP datos transporta profesijas veido ap 36% līdz 41% no visām trešo valstu darba atļaujām, tāpēc šis ir lielākais tiešais ieguvējs no ārvalstu darbaspēka.',
        source: COMMON_SOURCES.lsmPmlp,
      },
      {
        title: 'Būvniecība un specializētā būvniecība',
        detail: 'Būvniecība veido ap 9% līdz 10% no darba atļaujām un Ekonomikas ministrija to izceļ kā vienu no sektoriem ar izteiktu darbaspēka trūkumu.',
        source: COMMON_SOURCES.emShortages,
      },
      {
        title: 'Ražošana',
        detail: 'Ražošana ir viena no nozarēm, kur valdība tieši mīkstināja prasības ārvalstu darbinieku piesaistei darbaspēka trūkuma dēļ.',
        source: COMMON_SOURCES.emShortages,
      },
      {
        title: 'Ēdināšana, kurjeri un viesmīlība',
        detail: 'PVD un kurjeru reģistra uzraudzība rāda, ka šajās nozarēs ir būtiska ārvalstu darbaspēka klātbūtne un līdz ar to arī tiešs ieguvums uzņēmumiem no lētāka un elastīgāka darba spēka.',
        source: COMMON_SOURCES.lsmPvdCouriers,
      },
      {
        title: 'Programmēšana, inženierija un atlase',
        detail: 'PMLP/LSM dati rāda, ka starp biežākajiem darba virzieniem ir arī programmēšana, atlase un inženierija, tātad ieguvēji nav tikai zemās algas nozares.',
        source: COMMON_SOURCES.lsmPmlp,
      },
    ],
    labourSlackTitle: 'Vietējā darba tirgus rezerve',
    labourSlackSubtitle:
      'Pirms runāt par jaunu ieplūdi, jāskatās, vai Latvijā jau nav neizmantota darba rezerve pēc vecuma un bezdarba. Zemāk ir publiski pieejami oficiālie signāli, kas rāda, ka jautājums nav tikai par vakancēm.',
    labourSlackMetrics: [
      {
        label: 'Bezdarbs Q1 2025',
        value: '7.4%',
        detail: '2025. gada 1. ceturksnī Latvijā bija 69.5 tūkstoši bezdarbnieku vecumā 15-74 gadi.',
        source: COMMON_SOURCES.csbUnemploymentQ12025,
      },
      {
        label: 'Jauniešu bezdarbs 2025',
        value: '14.8%',
        detail: '2025. gadā jauniešu bezdarba līmenis bija 14.8%, bet 2025. gada beigās tas joprojām bija 13.5%.',
        source: COMMON_SOURCES.csbEmployment2025,
      },
      {
        label: 'Pirmspensijas vecums 55-64',
        value: '13.8%',
        detail: '2024. gadā 55-64 gadus veci cilvēki veidoja 13.8% no ekonomiski neaktīvajiem iedzīvotājiem; 64 gadu vecumā vēl nedaudz vairāk par pusi jeb 56.3% bija nodarbināti.',
        source: COMMON_SOURCES.csbPreRetirement,
      },
    ],
    unemploymentTitle: 'Bezdarbs un vakances jālasa kopā',
    unemploymentBody:
      'Plaša imigrācija ir grūtāk aizstāvama, ja vietējā darba rezerve vēl nav izsmelta. Ja kopējais bezdarbs ir ap 7% vai pieaug, panelim jāprasa nevis abstrakts “darbaspēka trūkums”, bet konkrēts pierādījums: kurā nozarē, kurā reģionā un kādā prasmju līmenī vakances tiešām nevar aizpildīt ar vietējiem cilvēkiem. Tāpēc šim skatam jāliek kopā bezdarba līmenis, vakances un algu spiediens, nevis jāskatās tikai uz uzņēmēju pieprasījumu pēc lētāka darba spēka.',
    unemploymentTag: 'Darba tirgus filtrs',
    institutionsTitle: 'Ko tas nozīmē iestādēm',
    institutionsSubtitle:
      'Šeit ir sajaukts divu tipu saturs: novēroti Latvijas signāli un modelēti pieņēmumi. PMLP ir tuvāk reālai novērotai slodzei, bet policijas un tiesu rindas zemāk nav oficiāla statistika.',
    institutions: [
      {
        key: 'pmlp',
        label: 'PMLP / migrācijas apstrāde',
        ratioPer10k: 42,
        annualCostPerFteEur: 32000,
        detail: 'Dokumentu pieņemšana, pārbaude, pagarināšana, klientu apkalpošana.',
        sourceType: 'observed_signal',
      },
      {
        key: 'police',
        label: 'Policija / uzraudzība',
        ratioPer10k: 18,
        annualCostPerFteEur: 36000,
        detail: 'Modelēts pieņēmums par papildu pārbaudēm, administratīvo uzraudzību un sabiedrisko kārtību. Tas nav balstīts uz konkrētu Latvijas FTE statistiku.',
        sourceType: 'modeled_assumption',
      },
      {
        key: 'courts',
        label: 'Tiesas / procesu slodze',
        ratioPer10k: 7,
        annualCostPerFteEur: 48000,
        detail: 'Modelēts pieņēmums par apelācijām, administratīvajiem strīdiem un statusa lietām. Tas nav balstīts uz oficiālu Latvijas lietu/FTE attiecību.',
        sourceType: 'modeled_assumption',
      },
    ],
    modeledTag: 'Modelēts pieņēmums',
    observedTag: 'Novērots signāls',
    evidenceTitle: 'Ko rāda OECD',
    evidenceBody:
      'OECD materiālos kopējā fiskālā ietekme bieži ir tuvu nullei, taču daudzās valstīs imigranti sākumā ienes mazāk publisko ieņēmumu uz cilvēku nekā vietējie. Tas nozīmē, ka masveida ieplūdes gadījumā ļoti svarīgs ir prasmju profils, nodarbinātības līmenis un valsts spēja ātri absorbēt cilvēkus legālā darbā.',
    secondaryInstitutionsTitle: 'Papildu iestādes, kurām rodas slodze',
    secondaryInstitutionsSubtitle:
      'Ne visa migrācijas slodze izpaužas policijā vai tiesās. Daļa darba parādās arī transporta, licencēšanas un dokumentu atbilstības sistēmās.',
    csddTitle: 'CSDD / vadītāju un transportlīdzekļu atbilstība',
    csddBody:
      'CSDD slodze rodas, ja ilgāk uzturas ārvalstu vadītāji un jāmaina ārvalstīs izsniegtas apliecības, jāpārbauda to autentiskums vai jādeklarē trešajās valstīs reģistrēti transportlīdzekļi. Pašlaik mums nav publiska FTE vai budžeta pārrēķina, tāpēc CSDD jāuzrāda kā reāla, bet neprecīzi kvantificēta slodzes vieta.',
    csddTag: 'Vidēja pārliecība, bez FTE skaitļa',
    municipalPoliceTitle: 'Pašvaldības policija / stāvēšanas un pamestu auto uzraudzība',
    municipalPoliceBody:
      'Pašvaldības policijai papildu slodze rodas ne tikai no satiksmes noteikumu pārkāpumiem, bet arī no nenosakāma īpašnieka transportlīdzekļiem, pamestiem auto, nepareizas novietošanas un evakuācijas procesa. Pieaugot ārvalstu vai neatbilstoši reģistrētu transportlīdzekļu klātbūtnei, pieaug arī identifikācijas, sodīšanas un piespiedu pārvietošanas administratīvais darbs.',
    municipalPoliceTag: 'Novērots signāls, bez FTE skaitļa',
    roadPoliceTitle: 'Ceļu policija / ceļu satiksmes kontrole',
    roadPoliceBody:
      'Ceļu policijai papildu slodze rodas, jo amatpersonas tagad var apturēt trešo valstu transportlīdzekļus, pārbaudīt tos CSDD deklarāciju reģistrā un piemērot sodu par nedeklarētu transportlīdzekli vai nenomaksātiem administratīvajiem sodiem. Tas ir reāls papildu kontroles slānis, bet mums nav publiska FTE pārrēķina.',
    roadPoliceTag: 'Vidēja pārliecība, bez FTE skaitļa',
    pvdTitle: 'PVD / pārtikas aprite un kurjeru uzraudzība',
    pvdBody:
      'PVD ir iesaistīts ne tikai higiēnas kontrolē. Tiešsaistes pārtikas kurjeru reģistrā PVD pārbaudīja iesniedzēju dokumentus, dzīvesvietas pamatojumu, tiesības uz nodarbinātību un datu atbilstību, sadarbojoties ar PMLP, VID un robežsardzi. Tas nozīmē, ka lielāka ārvalstu darbinieku plūsma ēdināšanā un piegādēs rada arī papildu uzraudzības slodzi PVD.',
    pvdTag: 'Novērots signāls, bez FTE skaitļa',
    ptacTitle: 'PTAC / cenu, atlaižu un patērētāju tiesību uzraudzība',
    ptacBody:
      'Papildu iedzīvotāju un zemo cenu pakalpojumu tirgus pieaugums rada arī sekundāru slodzi PTAC. Šai iestādei jākontrolē cenu norādīšana, atlaižu godīgums, e-komercijas prakse un patērētāju sūdzības. Latvijā PTAC jau 2025.-2026. gadā publiski monitorēja pamata pārtikas groza cenas un pastiprināja degvielas cenu uzraudzību. Tāpēc pie lielākas plūsmas un plašāka lēto pakalpojumu tirgus jāņem vērā arī patērētāju tiesību, cenu caurskatāmības un negodīgas komercprakses kontroles izmaksas.',
    ptacTag: 'Sekundārs tirgus un cenu uzraudzības efekts',
    ngoTitle: 'NVO un integrācijas sistēma / SIF, valodas kursi, palīdzības kanāli',
    ngoBody:
      'Integrācijas izmaksas nepaliek tikai valsts iestādēs. 2025. gada atbalsta plāns Ukrainas civiliedzīvotājiem tika lēsts ap €77 miljoniem, no kuriem apstiprināja €65 miljonus; atsevišķi €4.68 miljoni tika novirzīti SIF latviešu valodas kursiem. SIF jaunpienācēju aģentūras AMIF projekts 2026.-2029. gadam saņēma €2.44 miljonus, bet Ziedot.lv jau iepriekš bija novirzījis €2.5 miljonus bēgļu atbalstam. Tas ir tiešs fiskāls un institucionāls migrācijas efekts, kas jāuzrauga kā primārs impacts.',
    ngoTag: 'Tiešs fiskāls un institucionāls efekts',
    universitiesTitle: 'Augstskolas / ārvalstu studentu atbilstība un uzraudzība',
    universitiesBody:
      'Ārvalstu studentu plūsma rada ne tikai studiju, bet arī atbilstības slodzi: uzņemšana, klātbūtnes uzraudzība, studiju procesa kvalitāte un sadarbība ar IZM, ĀM un Iekšlietu ministriju. Latvijā šim nolūkam tika pagarināta vienošanās par labo praksi 16 augstskolās, kas rāda, ka studentu migrācija jau tiek uzraudzīta kā valsts līmeņa risks un administratīvs darbs.',
    universitiesTag: 'Novērots signāls, bez FTE skaitļa',
    housingTitle: 'Kopmītnes un studentu mājokļi / īres spiediens',
    housingBody:
      'Ārvalstu studentu ieplūde rada tiešu spiedienu uz kopmītnēm un īres tirgu. Jau agrāk studentu pieplūdums rudenī Rīgā palielināja īres pieprasījumu un samazināja pieejamo dzīvokļu piedāvājumu, tāpēc studentu migrācija jāuzrauga arī kā mājokļu tirgus un pašvaldību atbalsta jautājums.',
    housingTag: 'Novērots signāls, bez FTE skaitļa',
    socialHousingTitle: 'Pašvaldību sociālais atbalsts / mājoklis un palīdzība ikdienā',
    socialHousingBody:
      'Mājokļu un sociālā atbalsta izmaksas neapstājas pie īres tirgus. Valdības 2026. gada atbalsta plānā Ukrainas civiliedzīvotājiem atsevišķi tika segta izmitināšana, ēdināšana, sociālā un finansiālā palīdzība, kas nozīmē tiešu pašvaldību un labklājības sistēmas slodzi. Pieaugot plūsmām, šis ir viens no pirmajiem budžeta spiediena kanāliem.',
    socialHousingTag: 'Tiešs fiskāls un pašvaldību efekts',
    healthcareTitle: 'Veselības aprūpe / ģimenes ārsti, skrīnings, tulkošana',
    healthcareBody:
      'Veselības slodze rodas ne tikai no neatliekamās palīdzības, bet arī no primārās aprūpes, skrīninga, hronisku slimību uzraudzības un tulkošanas vajadzībām. Valsts atbalsta paketēs veselības aprūpe tiek izcelta kā atsevišķs finansējuma virziens, kas nozīmē, ka tā ir tieša un regulāri finansējama migrācijas ietekmes pozīcija.',
    healthcareTag: 'Novērots signāls, bez FTE skaitļa',
    vidTitle: 'VID / nodokļu, saimnieciskās darbības un deklarāciju administrēšana',
    vidBody:
      'Migrācija rada ne tikai darba tirgus, bet arī nodokļu administrēšanas slodzi: saimnieciskās darbības reģistrācija, deklarācijas, darba attiecību kontrole un zemo algu / pelēkās zonas uzraudzība. Pat Ukrainas civiliedzīvotāju atbalsta datos atsevišķi tika izcelts, ka daļa ir reģistrējuši saimniecisko darbību, kas rāda tiešu slodzi VID pusē.',
    vidTag: 'Novērots signāls, bez FTE skaitļa',
    transportTitle: 'Sabiedriskais transports / pilsētu infrastruktūras noslodze',
    transportBody:
      'Pieplūdums ietekmē arī pilsētu pārvietošanās sistēmas. Rīgas sabiedriskais transports 2025. gadā pārvadāja 118.5 miljonus pasažieru, un jaunas studentu un darba migrācijas plūsmas palielina slodzi maršrutiem, dotācijām un pašvaldību infrastruktūras plānošanai, īpaši Rīgā un citos izglītības centros.',
    transportTag: 'Novērots signāls, bez FTE skaitļa',
    enclaveTitle: 'Paralēlas ekonomiskās kopienas / savējie pērk un strādā pie savējiem',
    enclaveBody:
      'Kad viena migrantu grupa kļūst pietiekami liela, tā sāk veidot savu mazo ekonomisko loku: cilvēki pieņem darbā savējos, pērk pārtiku savos veikalos, ēd savos ēdināšanas punktos, meklē savas valodas pakalpojumus un uztur pieprasījumu pēc savām precēm. Tas palīdz jaunpienācējiem ātrāk atrast darbu un atbalstu, bet vienlaikus var vājināt integrāciju plašākā sabiedrībā un nostiprināt paralēlus zemo algu tirgus.',
    enclaveTag: 'Novērots tirgus un tīkla efekts',
    hospitalTitle: 'Slimnīcas / klīnisko prakšu kapacitāte',
    hospitalBody:
      'Medicīnas studiju ārvalstu plūsma rada arī klīnisko prakšu slodzi. RSU publiski norādīja, ka studentu skaitu nevar bezgalīgi palielināt, jo to ierobežo arī Latvijas slimnīcu kapacitāte nodrošināt prakses vietas. Tas ir tiešs sekundārs slogs veselības sistēmai.',
    hospitalTag: 'Novērots signāls, bez FTE skaitļa',
    labourTitle: 'NVA un Darba inspekcija / studentu darba atbilstība',
    labourBody:
      'Daļa trešo valstu studentu strādā paralēli studijām, tāpēc pieaug darba tiesību, līgumu, dzīvesvietas un darba stundu kontroles slogs. Šī ir atsevišķa administratīvā līnija, kas nav tas pats, kas klasiskā darba migrācija, un tā ir jāuzrauga NVA un Darba inspekcijai.',
    labourTag: 'Novērots signāls, bez FTE skaitļa',
    incomeFloorTitle: 'Minimālais deklarētais ienākums / VSAA maksājumu slieksnis',
    incomeFloorBody:
      'Ja uzturēšanās atļauja balstās uz darbu, sistēmai jāprasa reāls ikmēneša signāls, ka cilvēks tiešām strādā legāli: deklarēts ienākums un VSAA iemaksas vismaz virs noteikta minimālā sliekšņa. Ja vairākus mēnešus pēc kārtas šāds minimums netiek sasniegts bez pamatota izņēmuma, jāseko automātiskai eskalācijai: brīdinājums, termiņš situācijas sakārtošanai un pēc tam atļaujas pārskatīšana vai anulēšana. Praktiski tas palīdz atšķirt reālu darba migrāciju no formālas uzturēšanās bez pietiekamas ekonomiskās bāzes.',
    incomeFloorTag: 'Politikas mehānisms / konfigurējams slieksnis',
    educationTitle: 'Izglītības sistēma / skolas un valodas atbalsts',
    educationBody:
      'Izglītības sistēmai slodze aug ne tikai no skolēnu skaita, bet arī no integrācijas prasībām: vietas skolās, latviešu valodas atbalsts, papildu pedagogu kapacitāte, nometnes un psihoemocionālais atbalsts. 2025. gada sākumā Latvijā bija reģistrēti 7 665 Ukrainas bēgļu bērni vecumā no 5 līdz 18 gadiem, no kuriem 3 322 bija reģistrēti Latvijas izglītības sistēmā; 2025. gadā valdība apstiprināja €900 000 nometnēm, un agrāk piešķīra vairāk nekā €4 miljonus latviešu valodas apguvei.',
    educationTag: 'Novērots signāls, bez FTE skaitļa',
    wasteTitle: 'Pašvaldību policija un VVD / atkritumu un būvgružu uzraudzība',
    wasteBody:
      'Nelegāla atkritumu un būvgružu izmešana rada papildu slodzi ne tikai pašvaldību policijai, bet arī vides uzraudzībai. Daugavpilī pašvaldība 2025. gadā plānoja savākt ap 300 m³ nelegāli izmestu atkritumu atklātās teritorijās un vēl ap 200 m³ degradētās ēkās par gandrīz 50 000 eiro; par būvgružu izmešanu paredzētie sodi ir augstāki nekā par sadzīves atkritumiem. Tas nozīmē, ka pie lielākas plūsmas uzraudzība, izsekošana un savākšanas izmaksas var kāpt arī vides un pašvaldību pusē.',
    wasteTag: 'Novērots signāls, bez FTE skaitļa',
    comparativeRiskTitle: 'Salīdzinošais riska signāls no Vācijas',
    comparativeRiskBody:
      'Vācijas 2024. gada datos ne-Vācijas pilsoņi veidoja ap 39% identificēto izvarošanas un seksuālās vardarbības aizdomās turēto, kamēr ārvalstīs dzimušo iedzīvotāju daļa OECD datos bija ap 19.1%. Šo vajag lasīt kā pārstāvības riska signālu, nevis kā vienkāršu cēloņsakarības pierādījumu. Praktiskā mācība ir tāda, ka, pieaugot plūsmām, slodze skar ne tikai policiju un tiesas, bet arī pašvaldību prevenciju, patvēruma/migrācijas iestādes, vardarbības upuru atbalstu un sociālos dienestus.',
    comparativeRiskTag: 'Salīdzinošs signāls, nevis pierādīta cēloņsakarība',
    swedenInstitutionsTitle: 'Piemērs no Zviedrijas: ietekmēto iestāžu loks ir plašāks',
    swedenInstitutionsSubtitle:
      'Zviedrijas piemērs ir noderīgs nevis tāpēc, ka to var mehāniski kopēt uz Latviju, bet tāpēc, ka tas parāda institucionālo loģiku: migrācijas un drošības spiediens reti paliek tikai policijā un tiesās.',
    swedenInstitutions: [
      'Policija',
      'Tiesas',
      'Pašvaldības',
      'Migrācijas aģentūra',
      'Skolas',
      'Sociālie dienesti',
      'Vietējie noziedzības prevencijas koordinatori',
      'Upuru atbalsta un sieviešu atbalsta dienesti',
    ],
    swedenInstitutionsTag: 'Salīdzinošs institucionālās ietekmes piemērs',
    honestyTitle: 'Godīguma robeža',
    honestyBody:
      'Panelis nedrīkst izlikties, ka visiem migrantiem ir viens profils vai ka Latvijā jau ir perfekta formula “100 000 cilvēku = tieši X policisti un Y tiesneši”. Tāpēc profesiju sadalījums un institucionālā slodze šeit ir atklāti modelēta ar pieņēmumiem.',
    assumptionsTitle: 'Galvenie pieņēmumi',
    assumptions: [
      'Zemākas kvalifikācijas profilā darba iesaiste ir zemāka un sākotnējais nodokļu pienesums uz cilvēku ir mazāks.',
      'Publisko pakalpojumu izmaksas pieaug ne tikai sociālajā sfērā, bet arī dokumentu apstrādē, uzraudzībā un strīdu risināšanā.',
      'Institucionālā slodze ir lineāra tikai kā pirmais aptuvenais modelis; realitātē pie ļoti liela pieauguma izmaksas var kāpt straujāk.',
    ],
    sourceLabel: 'Avots',
    firstYearNet: 'Neto efekts',
    taxTake: 'Nodokļu pienesums',
    serviceCost: 'Pakalpojumu izmaksas',
    workParticipation: 'Darba iesaiste',
    estimatedWorkers: 'Strādājošie',
    typicalJobs: 'Tipiskie darbi',
    extraBudget: 'Papildu budžets',
    extraFte: 'Papildu FTE',
  },
  en: {
    eyebrow: 'Permits, work and budget pressure',
    title: 'A simple dashboard for what migration adds and what it costs',
    subtitle:
      'The point here is not moralising. It is to make the mechanism visible: how many people arrive, which types of jobs they are likely to enter, what the first-year fiscal return looks like, and what extra pressure this creates for OCMA, police, and courts.',
    chips: ['Scenarios instead of slogans', 'Skill profile is adjustable', 'Institutional load is assumption-based'],
    snapshotCards: [
      {
        label: 'TUA stock',
        value: '85,978',
        detail: 'Valid temporary residence permits in Latvia on 31 Dec 2024. Source: PMLP official statistics (XLSX).',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        label: 'First-time TUA 2024',
        value: '15,807',
        detail: 'First-time TUA issued in 2024: work 3,681; study 3,146; temporary protection (UA) 6,783; family 530.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        label: 'Work + family TUA',
        value: '26,200',
        detail: 'Valid TUA for work (18,820) and family reasons (7,380) on 31 Dec 2024.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        label: 'Temporary protection (UA)',
        value: '32,365',
        detail: 'Ukrainian civilians with temporary-protection TUA in Latvia on 31 Dec 2024.',
        source: COMMON_SOURCES.pmlpStats,
      },
    ],
    safetyTitle: 'Public-safety KPIs to watch',
    safetySubtitle:
      'These are official or publicly cited incident indicators measured in Latvia that can be used as a baseline monitoring panel. They are not proof of migration causality, but they are important public-safety signals.',
    safetyMetrics: [
      {
        label: 'Murder victims in 2024',
        value: '67',
        detail: 'Latvia recorded 67 murder victims in 2024.',
        source: COMMON_SOURCES.lsmMurders2024,
      },
      {
        label: 'Attempted murders in 2024',
        value: '32',
        detail: 'State Police data cited 32 attempted murders in 2024.',
        source: COMMON_SOURCES.lsmMurders2024,
      },
      {
        label: 'Threats to kill / grievous harm in 2023',
        value: '214',
        detail: 'This category nearly doubled in 2023 versus 2022.',
        source: COMMON_SOURCES.lsmDomesticReports2023,
      },
      {
        label: 'Stalking cases in 2023',
        value: '84',
        detail: 'There were 84 stalking cases in 2023, up from 53 a year earlier.',
        source: COMMON_SOURCES.lsmDomesticReports2023,
      },
      {
        label: 'Human trafficking cases in 2024',
        value: '38',
        detail: 'Latvia recorded 38 human trafficking cases in 2024.',
        source: COMMON_SOURCES.lsmTrafficking2024,
      },
      {
        label: 'Intentional homicides in 2023',
        value: '79',
        detail: 'Eurostat data still placed Latvia at the highest homicide rate in the EU per capita.',
        source: COMMON_SOURCES.lsmHomicideRate,
      },
    ],
    trendTitle: 'TUA by country',
    trendSubtitle:
      'Valid TUA at 31 December, by country of origin. Click a year to compare.',
    trendSeries: [
      {
        year: '2021',
        value: 46572,
        detail: 'Valid TUA 31 Dec 2021: work 17,285; family 6,510; study 6,948.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        year: '2022',
        value: 56725,
        detail: 'Valid TUA 31 Dec 2022: work 18,255; temp protection (UA) 9,724; study 7,178.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        year: '2023',
        value: 76735,
        detail: 'Valid TUA 31 Dec 2023: work 19,244; temp protection (UA) 26,395; study 8,857.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        year: '2024',
        value: 85978,
        detail: 'Valid TUA 31 Dec 2024: work 18,820; temp protection (UA) 32,365; study 9,695; family 7,380.',
        source: COMMON_SOURCES.pmlpStats,
      },
      {
        year: '2025',
        value: 82605,
        detail: 'Valid TUA 31 Dec 2025: work 18,672; temp protection (UA) 30,200; study 10,010; family 7,354.',
        source: COMMON_SOURCES.pmlpStats2025,
      },
    ],
    scenarioTitle: 'Scenario calculator',
    scenarioSubtitle:
      'Drag the slider and see what a larger inflow could mean. This is not a precise forecast, but a readable model with visible assumptions.',
    arrivalsLabel: 'New arrivals per year',
    arrivalsHelp: 'Scenario range from 0 to 100,000 people per year.',
    skillLabel: 'Skill profile',
    skillOptions: {
      low: 'Mostly lower-skill work',
      mixed: 'Mixed profile',
      high: 'More skilled workers',
    },
    fiscalTitle: 'First-year fiscal effect',
    fiscalSubtitle:
      'This block shows a simple first-year model: tax take, public-service cost, and the net gap.',
    jobsTitle: 'Where they would typically work',
    jobsSubtitle:
      'Latvia’s Economics Ministry points to shortages especially in manufacturing and construction. The split below is a scenario mix, not an official permit-by-occupation table.',
    beneficiariesTitle: 'Biggest beneficiaries of migration inflow',
    beneficiariesSubtitle:
      'Publicly available data lets us identify sectors confidently, but not yet a clean company leaderboard. These are the sectors that appear to benefit most from added labour and student inflow.',
    beneficiaries: [
      {
        title: 'Transport and logistics',
        detail: 'PMLP-based reporting shows transport-related jobs make up about 36% to 41% of all third-country work permits, making this the clearest direct beneficiary sector.',
        source: COMMON_SOURCES.lsmPmlp,
      },
      {
        title: 'Construction and specialized construction',
        detail: 'Construction accounts for roughly 9% to 10% of work permits, and the Economics Ministry explicitly lists it among the sectors with acute labour shortages.',
        source: COMMON_SOURCES.emShortages,
      },
      {
        title: 'Manufacturing',
        detail: 'Manufacturing is one of the sectors where the government directly eased foreign-worker attraction rules because of labour shortages.',
        source: COMMON_SOURCES.emShortages,
      },
      {
        title: 'Food delivery, catering, and hospitality',
        detail: 'PVD and courier-register oversight show a strong foreign-worker presence in these sectors, meaning firms there benefit directly from more flexible labour supply.',
        source: COMMON_SOURCES.lsmPvdCouriers,
      },
      {
        title: 'Programming, engineering, and recruitment',
        detail: 'PMLP/LSM reporting also shows programming, engineering, and recruitment among the common foreign-worker occupation areas, so beneficiaries are not limited to low-wage sectors.',
        source: COMMON_SOURCES.lsmPmlp,
      },
    ],
    labourSlackTitle: 'Domestic labour slack',
    labourSlackSubtitle:
      'Before arguing for additional inflow, the dashboard should show whether Latvia already has underused labour by age and unemployment status. These are official public signals that the issue is not only vacancies.',
    labourSlackMetrics: [
      {
        label: 'Unemployment in Q1 2025',
        value: '7.4%',
        detail: 'In Q1 2025 Latvia had 69.5 thousand unemployed people aged 15-74.',
        source: COMMON_SOURCES.csbUnemploymentQ12025,
      },
      {
        label: 'Youth unemployment in 2025',
        value: '14.8%',
        detail: 'Youth unemployment was 14.8% in 2025, and still stood at 13.5% at the end of 2025.',
        source: COMMON_SOURCES.csbEmployment2025,
      },
      {
        label: 'Pre-retirement age 55-64',
        value: '13.8%',
        detail: 'In 2024, people aged 55-64 made up 13.8% of the inactive population; even at age 64, a little over half, 56.3%, were employed.',
        source: COMMON_SOURCES.csbPreRetirement,
      },
    ],
    unemploymentTitle: 'Unemployment and vacancies should be read together',
    unemploymentBody:
      'Broad immigration is harder to defend if the domestic labour reserve is not yet exhausted. If headline unemployment is around 7% or rising, the dashboard should demand more than a vague “labour shortage” claim: it should show which sector, which region, and which skill band genuinely cannot be filled from the domestic workforce. That is why this view should read unemployment, vacancies, and wage pressure together rather than only employer demand for cheaper labour.',
    unemploymentTag: 'Labour-market filter',
    institutionsTitle: 'What this means for institutions',
    institutionsSubtitle:
      'This mixes two content types: observed Latvia signals and modeled assumptions. OCMA is closer to an observed workload signal, while police and court lines below are not official statistical ratios.',
    institutions: [
      {
        key: 'pmlp',
        label: 'OCMA / migration processing',
        ratioPer10k: 42,
        annualCostPerFteEur: 32000,
        detail: 'Document intake, screening, renewals, customer service.',
        sourceType: 'observed_signal',
      },
      {
        key: 'police',
        label: 'Police / supervision',
        ratioPer10k: 18,
        annualCostPerFteEur: 36000,
        detail: 'Modeled assumption for extra checks, administrative supervision, and public-order work. It is not backed by a specific Latvia FTE ratio.',
        sourceType: 'modeled_assumption',
      },
      {
        key: 'courts',
        label: 'Courts / legal process',
        ratioPer10k: 7,
        annualCostPerFteEur: 48000,
        detail: 'Modeled assumption for appeals, administrative disputes, and status/removal cases. It is not backed by an official Latvia case-to-FTE series.',
        sourceType: 'modeled_assumption',
      },
    ],
    modeledTag: 'Modeled assumption',
    observedTag: 'Observed signal',
    evidenceTitle: 'What OECD evidence says',
    evidenceBody:
      'Across OECD material, the overall fiscal impact is often close to zero, but in many countries immigrants initially generate less public revenue per person than the native-born. That means under mass inflow the skill mix, employment rate, and state capacity to absorb people into legal work become decisive.',
    secondaryInstitutionsTitle: 'Additional institutions under pressure',
    secondaryInstitutionsSubtitle:
      'Not all migration-related pressure appears in police or courts. Some of it shows up in transport, licensing, and document-compliance systems as well.',
    csddTitle: 'CSDD / driver and vehicle compliance',
    csddBody:
      'CSDD workload rises when foreign drivers stay long enough to require licence exchange, when foreign licences must be authenticated, or when third-country vehicles have to be declared for legal use in Latvia. We do not currently have a public FTE or budget conversion, so CSDD should be shown as a real but not yet quantified pressure point.',
    csddTag: 'Medium confidence, no FTE count',
    municipalPoliceTitle: 'Municipal police / parking and abandoned-vehicle enforcement',
    municipalPoliceBody:
      'Municipal police workload rises not only from traffic offences but also from unidentified vehicles, abandoned cars, illegal parking, and towing procedures. As the share of foreign or non-compliant vehicles grows, so does the administrative burden around identification, fines, and forced removal.',
    municipalPoliceTag: 'Observed signal, no FTE count',
    roadPoliceTitle: 'Road police / traffic enforcement',
    roadPoliceBody:
      'Road police face additional workload because officers can now stop third-country vehicles, check them in the CSDD declaration register, and enforce unpaid administrative fines before drivers continue. This is a real added enforcement layer, but we do not have a public FTE conversion for it.',
    roadPoliceTag: 'Medium confidence, no FTE count',
    pvdTitle: 'PVD / food-chain and courier supervision',
    pvdBody:
      'PVD is involved in more than hygiene checks. In the online food-courier register, PVD verified applicants’ documents, basis of residence, right to employment, and data consistency while exchanging data with OCMA, the tax authority, and the Border Guard. That means a larger foreign-worker presence in food and delivery sectors also creates supervisory load for PVD.',
    pvdTag: 'Observed signal, no FTE count',
    ptacTitle: 'PTAC / price, discount, and consumer-rights oversight',
    ptacBody:
      'A larger low-cost service market and a bigger consumer base also create secondary pressure for PTAC. The agency has to supervise price indication, discount practices, e-commerce behaviour, and consumer complaints. In Latvia, PTAC was already publicly monitoring the basic food basket in 2025 and intensified fuel-price supervision in 2026. That means wider inflow and a broader low-price service economy can also increase consumer-protection and price-transparency enforcement work.',
    ptacTag: 'Secondary market and price-monitoring effect',
    ngoTitle: 'NGOs and integration system / SIF, language courses, aid channels',
    ngoBody:
      'Integration costs do not stay inside state agencies. The 2025 support plan for Ukrainian civilians was estimated at about €77 million, with €65 million approved; separately, €4.68 million was allocated to SIF for Latvian language courses. SIF’s newcomer-agency AMIF project for 2026-2029 received €2.44 million, and Ziedot.lv had already channelled €2.5 million in aid to refugees. This is a direct fiscal and institutional migration effect that should be monitored as a primary impact channel.',
    ngoTag: 'Direct fiscal and institutional effect',
    universitiesTitle: 'Universities / foreign-student compliance and oversight',
    universitiesBody:
      'Foreign-student inflow creates not only academic load but also compliance load: admissions control, attendance monitoring, study-quality checks, and coordination with the Education Ministry, Foreign Ministry, and Interior Ministry. Latvia extended a good-practice agreement across 16 universities, which shows that student migration is already treated as a state-level risk and administrative workload.',
    universitiesTag: 'Observed signal, no FTE count',
    housingTitle: 'Dormitories and student housing / rental pressure',
    housingBody:
      'Foreign-student inflow creates direct pressure on dormitories and the rental market. Student inflows in Riga have already increased rental demand and reduced available apartment supply, so student migration should also be tracked as a housing-market and municipal-support issue.',
    housingTag: 'Observed signal, no FTE count',
    socialHousingTitle: 'Municipal social support / housing and day-to-day assistance',
    socialHousingBody:
      'Housing and social-support costs do not stop at the rental market. In the 2026 support plan for Ukrainian civilians, accommodation, food, and social/financial assistance were covered as separate budget lines, which shows direct municipal and welfare-system pressure. As inflows rise, this becomes one of the first budget channels to tighten.',
    socialHousingTag: 'Direct fiscal and municipal effect',
    healthcareTitle: 'Healthcare / family doctors, screening, interpretation',
    healthcareBody:
      'Health-system pressure comes not only from emergency care but also from primary care, screening, chronic-condition management, and interpretation needs. Government support packages treat healthcare as a distinct funding line, which means it is a direct and recurrent migration-impact category rather than a secondary side effect.',
    healthcareTag: 'Observed signal, no FTE count',
    vidTitle: 'Tax administration / registrations, payroll, declarations',
    vidBody:
      'Migration creates not only labour-market pressure but also tax-administration pressure: economic-activity registration, declarations, employment checks, and oversight of low-wage or grey-zone work. Even the Ukrainian-civilian support data separately noted those who had registered economic activity, which is a direct signal of workload for the tax authority.',
    vidTag: 'Observed signal, no FTE count',
    transportTitle: 'Public transport / urban infrastructure load',
    transportBody:
      'Inflow also affects city mobility systems. Riga public transport carried 118.5 million passengers in 2025, and new student and worker inflows increase route pressure, subsidy requirements, and municipal infrastructure planning needs, especially in Riga and other education hubs.',
    transportTag: 'Observed signal, no FTE count',
    enclaveTitle: 'Parallel economic communities / people hire and buy within the same network',
    enclaveBody:
      'Once a migrant group becomes large enough, it often starts forming its own small economic loop: people hire within the same network, shop in community-specific stores, eat in community-specific food outlets, and seek services in their own language. This helps newcomers find work and support faster, but it can also weaken wider integration and reinforce parallel low-wage markets.',
    enclaveTag: 'Observed market and network effect',
    hospitalTitle: 'Hospitals / clinical placement capacity',
    hospitalBody:
      'Foreign-student growth in medical programmes also creates clinical-placement pressure. RSU has publicly said student numbers cannot be expanded without limits because Latvian hospitals also constrain the available training capacity. This is a direct secondary burden on the health system.',
    hospitalTag: 'Observed signal, no FTE count',
    labourTitle: 'Employment agency and Labour Inspectorate / student-work compliance',
    labourBody:
      'A share of third-country students work while studying, which increases monitoring needs around labour-law compliance, contracts, residence basis, and working-time rules. This is a separate administrative line from classic labour migration and should be tracked through employment services and labour inspection.',
    labourTag: 'Observed signal, no FTE count',
    incomeFloorTitle: 'Minimum declared income / social-contribution floor',
    incomeFloorBody:
      'If a residence permit is based on work, the system should require a real monthly signal that the person is actually in legal employment: declared income and social-insurance contributions above a minimum threshold. If that floor is not met for several months in a row without a justified exception, the case should escalate automatically: warning, short correction period, then permit review or cancellation. In practice this helps separate genuine labour migration from formal residence without a sufficient economic base.',
    incomeFloorTag: 'Policy mechanism / configurable threshold',
    educationTitle: 'Education system / schools and language support',
    educationBody:
      'Education pressure rises not only from pupil counts but also from integration requirements: school places, Latvian-language support, extra teaching capacity, camps, and psycho-emotional support. At the start of 2025, 7,665 Ukrainian refugee children aged 5-18 were registered in Latvia, of whom 3,322 were registered in the Latvian education system; in 2025 the government approved €900,000 for camps, and earlier allocated more than €4 million for Latvian language lessons.',
    educationTag: 'Observed signal, no FTE count',
    wasteTitle: 'Municipal police and State Environmental Service / waste and construction-dump monitoring',
    wasteBody:
      'Illegal dumping and construction-waste disposal create extra load not only for municipal police but also for environmental enforcement. In Daugavpils, the municipality planned in 2025 to remove about 300 m³ of illegally dumped waste from open areas and another 200 m³ from degraded buildings at a cost of almost €50,000; fines for construction waste are higher than for ordinary household dumping. That means higher inflow can also translate into more monitoring, tracing, and cleanup costs on the municipal and environmental side.',
    wasteTag: 'Observed signal, no FTE count',
    comparativeRiskTitle: 'Comparative risk signal from Germany',
    comparativeRiskBody:
      'In Germany’s 2024 data, non-German nationals accounted for about 39% of identified rape/sexual-violence suspects, while the OECD put the foreign-born population share at about 19.1%. This should be read as an overrepresentation signal, not as simple causal proof. The practical lesson is that larger inflows can affect not only police and courts, but also municipal prevention systems, migration authorities, victim support, and social services.',
    comparativeRiskTag: 'Comparative signal, not proven causality',
    swedenInstitutionsTitle: 'Sweden example: the affected institution set is wider',
    swedenInstitutionsSubtitle:
      'The Sweden example is useful not because it can be copied mechanically to Latvia, but because it shows the institutional logic: migration and security pressure rarely remains confined to police and courts.',
    swedenInstitutions: [
      'Police',
      'Courts',
      'Municipalities',
      'Migration agency',
      'Schools',
      'Social services',
      'Local crime-prevention coordinators',
      'Victim-support and women’s support services',
    ],
    swedenInstitutionsTag: 'Comparative institutional-impact example',
    honestyTitle: 'Honesty boundary',
    honestyBody:
      'The dashboard should not pretend all migrants have one profile or that Latvia already has a perfect formula saying “100,000 people = exactly X police and Y judges”. That is why occupation mix and institutional load here are explicit modelling assumptions.',
    assumptionsTitle: 'Main assumptions',
    assumptions: [
      'In the lower-skill profile, employment participation is lower and first-year tax contribution per person is weaker.',
      'Public-service cost rises not only in social systems but also in document processing, supervision, and dispute resolution.',
      'Institutional load is linear only as a first approximation; under very large inflows, real costs can rise faster.',
    ],
    sourceLabel: 'Source',
    firstYearNet: 'Net effect',
    taxTake: 'Tax take',
    serviceCost: 'Service cost',
    workParticipation: 'Work participation',
    estimatedWorkers: 'Workers',
    typicalJobs: 'Typical jobs',
    extraBudget: 'Extra budget',
    extraFte: 'Extra FTE',
  },
};

const SKILL_ASSUMPTIONS: Record<
  SkillProfile,
  {
    employmentRate: number;
    avgTaxPerWorker: number;
    publicServiceCostPerPerson: number;
    sectors: SectorMix[];
  }
> = {
  low: {
    employmentRate: 0.58,
    avgTaxPerWorker: 9500,
    publicServiceCostPerPerson: 7200,
    sectors: [
      { label: 'Construction', value: 24 },
      { label: 'Manufacturing', value: 22 },
      { label: 'Warehousing / logistics', value: 18 },
      { label: 'Hospitality / food', value: 16 },
      { label: 'Basic services / cleaning', value: 12 },
      { label: 'Other', value: 8 },
    ],
  },
  mixed: {
    employmentRate: 0.68,
    avgTaxPerWorker: 13500,
    publicServiceCostPerPerson: 6900,
    sectors: [
      { label: 'Manufacturing', value: 21 },
      { label: 'Construction', value: 17 },
      { label: 'Logistics', value: 15 },
      { label: 'Retail / hospitality', value: 13 },
      { label: 'Care / support services', value: 14 },
      { label: 'Professional / office roles', value: 20 },
    ],
  },
  high: {
    employmentRate: 0.76,
    avgTaxPerWorker: 19800,
    publicServiceCostPerPerson: 6400,
    sectors: [
      { label: 'Professional services', value: 26 },
      { label: 'IT / digital', value: 20 },
      { label: 'Engineering / manufacturing', value: 18 },
      { label: 'Health / care', value: 14 },
      { label: 'Education / research', value: 10 },
      { label: 'Other', value: 12 },
    ],
  },
};

function SourceLink({ source }: { source: SourceMeta }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
    >
      {source.label}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}

function formatCompact(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === 'lv' ? 'lv-LV' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === 'lv' ? 'lv-LV' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

type CountryRow = {
  country: string;
  total: number;
  work: number;
  study: number;
  family: number;
  temp_protection: number;
};

type YearData = { total: number; countries: CountryRow[] };

const TUA_BY_COUNTRY: Record<string, YearData> = {
  '2021': { total: 46572, countries: [
    { country: 'Krievija', total: 10368, work: 1562, study: 275, family: 2509, temp_protection: 0 },
    { country: 'Ukraina', total: 7075, work: 4755, study: 139, family: 1069, temp_protection: 0 },
    { country: 'Baltkrievija', total: 2617, work: 1466, study: 73, family: 578, temp_protection: 0 },
    { country: 'Lietuva', total: 2564, work: 1348, study: 140, family: 214, temp_protection: 0 },
    { country: 'Vācija', total: 2472, work: 470, study: 888, family: 99, temp_protection: 0 },
    { country: 'Uzbekistāna', total: 2375, work: 930, study: 1091, family: 108, temp_protection: 0 },
    { country: 'Indija', total: 2099, work: 404, study: 1496, family: 97, temp_protection: 0 },
    { country: 'Lielbritānija', total: 1180, work: 394, study: 51, family: 162, temp_protection: 0 },
    { country: 'Itālija', total: 886, work: 444, study: 133, family: 42, temp_protection: 0 },
    { country: 'Bulgārija', total: 864, work: 744, study: 15, family: 20, temp_protection: 0 },
    { country: 'Francija', total: 829, work: 346, study: 102, family: 32, temp_protection: 0 },
    { country: 'Azerbaidžāna', total: 768, work: 220, study: 347, family: 77, temp_protection: 0 },
    { country: 'Zviedrija', total: 634, work: 231, study: 69, family: 60, temp_protection: 0 },
    { country: 'Gruzija', total: 576, work: 203, study: 91, family: 77, temp_protection: 0 },
    { country: 'Izraēla', total: 551, work: 162, study: 68, family: 56, temp_protection: 0 },
  ]},
  '2022': { total: 56725, countries: [
    { country: 'Ukraina', total: 15772, work: 3940, study: 139, family: 1008, temp_protection: 9686 },
    { country: 'Krievija', total: 9023, work: 1355, study: 197, family: 2371, temp_protection: 12 },
    { country: 'Uzbekistāna', total: 3343, work: 1679, study: 1243, family: 120, temp_protection: 6 },
    { country: 'Lietuva', total: 2605, work: 1348, study: 145, family: 219, temp_protection: 0 },
    { country: 'Indija', total: 2550, work: 788, study: 1456, family: 104, temp_protection: 0 },
    { country: 'Vācija', total: 2511, work: 487, study: 837, family: 109, temp_protection: 0 },
    { country: 'Baltkrievija', total: 2494, work: 1403, study: 56, family: 507, temp_protection: 1 },
    { country: 'Lielbritānija', total: 1213, work: 407, study: 57, family: 188, temp_protection: 0 },
    { country: 'Itālija', total: 948, work: 506, study: 132, family: 46, temp_protection: 0 },
    { country: 'Francija', total: 915, work: 389, study: 101, family: 32, temp_protection: 0 },
    { country: 'Azerbaidžāna', total: 867, work: 287, study: 365, family: 88, temp_protection: 0 },
    { country: 'Bulgārija', total: 791, work: 682, study: 12, family: 20, temp_protection: 0 },
    { country: 'Zviedrija', total: 658, work: 245, study: 70, family: 63, temp_protection: 0 },
    { country: 'Gruzija', total: 652, work: 267, study: 88, family: 88, temp_protection: 0 },
    { country: 'Izraēla', total: 598, work: 174, study: 75, family: 57, temp_protection: 0 },
  ]},
  '2023': { total: 76735, countries: [
    { country: 'Ukraina', total: 31612, work: 3402, study: 137, family: 969, temp_protection: 26220 },
    { country: 'Krievija', total: 8729, work: 1120, study: 175, family: 3331, temp_protection: 91 },
    { country: 'Indija', total: 4132, work: 1181, study: 2543, family: 101, temp_protection: 1 },
    { country: 'Uzbekistāna', total: 3878, work: 2198, study: 1200, family: 133, temp_protection: 8 },
    { country: 'Vācija', total: 2636, work: 508, study: 855, family: 116, temp_protection: 0 },
    { country: 'Lietuva', total: 2622, work: 1328, study: 159, family: 216, temp_protection: 0 },
    { country: 'Baltkrievija', total: 2555, work: 1421, study: 40, family: 530, temp_protection: 11 },
    { country: 'Lielbritānija', total: 1280, work: 432, study: 66, family: 216, temp_protection: 0 },
    { country: 'Itālija', total: 1017, work: 555, study: 148, family: 47, temp_protection: 0 },
    { country: 'Francija', total: 978, work: 417, study: 103, family: 34, temp_protection: 0 },
    { country: 'Azerbaidžāna', total: 974, work: 328, study: 398, family: 96, temp_protection: 0 },
    { country: 'Bulgārija', total: 814, work: 710, study: 11, family: 20, temp_protection: 0 },
    { country: 'Gruzija', total: 778, work: 339, study: 97, family: 105, temp_protection: 0 },
    { country: 'Zviedrija', total: 681, work: 247, study: 73, family: 68, temp_protection: 0 },
    { country: 'Izraēla', total: 634, work: 182, study: 77, family: 62, temp_protection: 0 },
  ]},
  '2024': { total: 85978, countries: [
    { country: 'Ukraina', total: 36203, work: 2371, study: 122, family: 857, temp_protection: 32142 },
    { country: 'Krievija', total: 10741, work: 736, study: 115, family: 3120, temp_protection: 111 },
    { country: 'Indija', total: 5245, work: 1421, study: 3313, family: 117, temp_protection: 5 },
    { country: 'Uzbekistāna', total: 4077, work: 2509, study: 1033, family: 167, temp_protection: 10 },
    { country: 'Vācija', total: 2754, work: 532, study: 872, family: 118, temp_protection: 0 },
    { country: 'Lietuva', total: 2609, work: 1317, study: 152, family: 209, temp_protection: 0 },
    { country: 'Baltkrievija', total: 2455, work: 1387, study: 35, family: 516, temp_protection: 13 },
    { country: 'Lielbritānija', total: 1309, work: 432, study: 67, family: 250, temp_protection: 0 },
    { country: 'Itālija', total: 1066, work: 590, study: 157, family: 49, temp_protection: 0 },
    { country: 'Francija', total: 1036, work: 434, study: 108, family: 36, temp_protection: 0 },
    { country: 'Azerbaidžāna', total: 1034, work: 337, study: 423, family: 100, temp_protection: 0 },
    { country: 'Bulgārija', total: 816, work: 715, study: 10, family: 20, temp_protection: 0 },
    { country: 'Gruzija', total: 812, work: 354, study: 104, family: 116, temp_protection: 0 },
    { country: 'Zviedrija', total: 698, work: 247, study: 75, family: 72, temp_protection: 0 },
    { country: 'Izraēla', total: 665, work: 186, study: 80, family: 65, temp_protection: 0 },
  ]},
  '2025': { total: 82605, countries: [
    { country: 'Ukraina', total: 33267, work: 2406, study: 133, family: 842, temp_protection: 29216 },
    { country: 'Krievija', total: 8982, work: 645, study: 107, family: 2870, temp_protection: 92 },
    { country: 'Indija', total: 5954, work: 1520, study: 3936, family: 119, temp_protection: 3 },
    { country: 'Uzbekistāna', total: 4796, work: 2820, study: 1416, family: 178, temp_protection: 10 },
    { country: 'Vācija', total: 2407, work: 486, study: 809, family: 112, temp_protection: 0 },
    { country: 'Lietuva', total: 2391, work: 1199, study: 148, family: 196, temp_protection: 0 },
    { country: 'Baltkrievija', total: 2179, work: 1205, study: 29, family: 466, temp_protection: 12 },
    { country: 'Lielbritānija', total: 1283, work: 406, study: 62, family: 237, temp_protection: 0 },
    { country: 'Azerbaidžāna', total: 1121, work: 349, study: 501, family: 103, temp_protection: 0 },
    { country: 'Itālija', total: 1044, work: 568, study: 157, family: 49, temp_protection: 0 },
    { country: 'Francija', total: 1012, work: 415, study: 104, family: 36, temp_protection: 0 },
    { country: 'Gruzija', total: 875, work: 373, study: 120, family: 120, temp_protection: 0 },
    { country: 'Bulgārija', total: 747, work: 653, study: 8, family: 19, temp_protection: 0 },
    { country: 'Zviedrija', total: 672, work: 230, study: 70, family: 69, temp_protection: 0 },
    { country: 'Izraēla', total: 655, work: 178, study: 80, family: 64, temp_protection: 0 },
  ]},
};

const REASON_COLORS = {
  work: 'bg-sky-500',
  study: 'bg-violet-500',
  family: 'bg-emerald-500',
  temp_protection: 'bg-amber-400',
  other: 'bg-slate-300',
};

type ReasonKey = keyof typeof REASON_COLORS;

function TuaByCountryChart({ locale }: { locale: Locale }) {
  const years = Object.keys(TUA_BY_COUNTRY).sort();
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set([years[years.length - 1]]));
  const [selectedReason, setSelectedReason] = useState<ReasonKey | null>(null);
  const isLv = locale === 'lv';

  const toggleYear = (y: string) => {
    setSelectedYears((prev) => {
      const next = new Set(prev);
      if (next.has(y)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(y);
      } else {
        next.add(y);
      }
      return next;
    });
  };

  // Aggregate countries across selected years
  const aggregated = useMemo(() => {
    const map = new Map<string, CountryRow>();
    for (const y of years) {
      if (!selectedYears.has(y)) continue;
      for (const c of TUA_BY_COUNTRY[y].countries) {
        const existing = map.get(c.country);
        if (existing) {
          map.set(c.country, {
            country: c.country,
            total: existing.total + c.total,
            work: existing.work + c.work,
            study: existing.study + c.study,
            family: existing.family + c.family,
            temp_protection: existing.temp_protection + c.temp_protection,
          });
        } else {
          map.set(c.country, { ...c });
        }
      }
    }
    return Array.from(map.values());
  }, [selectedYears]);

  const labels: Record<ReasonKey, string> = {
    work: isLv ? 'Darbs' : 'Work',
    study: isLv ? 'Studijas' : 'Study',
    family: isLv ? 'Ģimene' : 'Family',
    temp_protection: isLv ? 'Pagaidu aizsardzība' : 'Temp. protection',
    other: isLv ? 'Citi' : 'Other',
  };

  const getValue = (c: CountryRow, reason: ReasonKey | null): number => {
    if (!reason) return c.total;
    const other = Math.max(0, c.total - c.work - c.study - c.family - c.temp_protection);
    return reason === 'work' ? c.work
      : reason === 'study' ? c.study
      : reason === 'family' ? c.family
      : reason === 'temp_protection' ? c.temp_protection
      : other;
  };

  const rows = [...aggregated]
    .map((c) => ({ ...c, displayValue: getValue(c, selectedReason) }))
    .filter((c) => c.displayValue > 0)
    .sort((a, b) => b.displayValue - a.displayValue);

  const maxValue = Math.max(...rows.map((c) => c.displayValue), 1);
  const filteredTotal = rows.reduce((s, c) => s + c.displayValue, 0);

  const barColor = selectedReason ? REASON_COLORS[selectedReason] : 'bg-sky-500';

  return (
    <div className="space-y-4">
      {/* Year tabs — multi-select */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => toggleYear(y)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              selectedYears.has(y)
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {y}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 shrink-0">
          {isLv ? 'Kopā' : 'Total'}: {filteredTotal.toLocaleString(isLv ? 'lv-LV' : 'en-US')}
        </span>
      </div>

      {/* Reason filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedReason(null)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selectedReason === null
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {isLv ? 'Visi' : 'All'}
        </button>
        {(Object.keys(REASON_COLORS) as ReasonKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setSelectedReason(selectedReason === k ? null : k)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedReason === k
                ? 'text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            style={selectedReason === k ? { backgroundColor: reasonHex(k) } : undefined}
          >
            <span
              className={`inline-block h-2 w-2 rounded-sm ${selectedReason === k ? 'bg-white/60' : REASON_COLORS[k]}`}
            />
            {labels[k]}
          </button>
        ))}
      </div>

      {/* Country rows */}
      <div className="space-y-1.5">
        {rows.map((c) => (
          <div key={c.country} className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700 w-28 shrink-0 truncate">{c.country}</span>
            <div className="flex-1 h-5 overflow-hidden rounded bg-slate-100 flex">
              {selectedReason === null ? (
                (() => {
                  const other = Math.max(0, c.total - c.work - c.study - c.family - c.temp_protection);
                  return (
                    <>
                      {([
                        { key: 'work' as ReasonKey, value: c.work },
                        { key: 'study' as ReasonKey, value: c.study },
                        { key: 'family' as ReasonKey, value: c.family },
                        { key: 'temp_protection' as ReasonKey, value: c.temp_protection },
                        { key: 'other' as ReasonKey, value: other },
                      ]).map((seg) =>
                        seg.value > 0 ? (
                          <div
                            key={seg.key}
                            title={`${labels[seg.key]}: ${seg.value.toLocaleString()}`}
                            className={`h-full ${REASON_COLORS[seg.key]} transition-all`}
                            style={{ width: `${(seg.value / maxValue) * 100}%` }}
                          />
                        ) : null
                      )}
                    </>
                  );
                })()
              ) : (
                <div
                  className={`h-full rounded transition-all ${barColor}`}
                  style={{ width: `${(c.displayValue / maxValue) * 100}%` }}
                />
              )}
            </div>
            <span className="text-xs font-semibold text-slate-900 w-14 text-right shrink-0">
              {c.displayValue.toLocaleString(isLv ? 'lv-LV' : 'en-US')}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        {isLv
          ? 'Avots: PMLP statistika — pmlp.gov.lv (XLSX). Derīgas TUA gada 31. decembrī.'
          : 'Source: PMLP statistics — pmlp.gov.lv (XLSX). Valid TUA at 31 December.'}
      </p>
    </div>
  );
}

function reasonHex(k: ReasonKey): string {
  return k === 'work' ? '#0284c7'
    : k === 'study' ? '#7c3aed'
    : k === 'family' ? '#059669'
    : k === 'temp_protection' ? '#fbbf24'
    : '#94a3b8';
}

export function PolicyModelTab() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const [arrivals, setArrivals] = useState(25000);
  const [skillProfile, setSkillProfile] = useState<SkillProfile>('mixed');

  const scenario = useMemo(() => {
    const skill = SKILL_ASSUMPTIONS[skillProfile];
    const workers = Math.round(arrivals * skill.employmentRate);
    const taxTake = workers * skill.avgTaxPerWorker;
    const serviceCost = arrivals * skill.publicServiceCostPerPerson;
    const netEffect = taxTake - serviceCost;
    const institutionLoads = copy.institutions.map((institution) => {
      const extraFte = (arrivals / 10000) * institution.ratioPer10k;
      return {
        ...institution,
        extraFte,
        extraBudget: extraFte * institution.annualCostPerFteEur,
      };
    });

    return {
      workers,
      taxTake,
      serviceCost,
      netEffect,
      employmentRate: skill.employmentRate,
      sectors: skill.sectors,
      institutionLoads,
      totalInstitutionBudget: institutionLoads.reduce((sum, item) => sum + item.extraBudget, 0),
    };
  }, [arrivals, copy.institutions, skillProfile]);

  return (
    <div className="space-y-6">
      <MigrationOverviewCard />

      <Card className="overflow-hidden border-slate-300/80 bg-gradient-to-br from-slate-50 via-white to-emerald-50/60">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-slate-300 bg-white/80 text-slate-700">
              <FileBarChart2 className="mr-1 h-3.5 w-3.5" />
              {copy.eyebrow}
            </Badge>
            {copy.chips.map((chip) => (
              <Badge key={chip} variant="secondary" className="bg-slate-900 text-white">
                {chip}
              </Badge>
            ))}
          </div>
          <div className="max-w-4xl space-y-3">
            <CardTitle className="text-3xl leading-tight text-slate-950">{copy.title}</CardTitle>
            <CardDescription className="text-base leading-7 text-slate-600">{copy.subtitle}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {copy.snapshotCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{card.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.detail}</p>
                <div className="mt-3">
                  <SourceLink source={card.source} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl text-slate-950">{copy.trendTitle}</CardTitle>
            <CardDescription className="text-sm leading-6">{copy.trendSubtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <TuaByCountryChart locale={locale} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-950 text-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-slate-200" />
              <CardTitle className="text-xl">{copy.evidenceTitle}</CardTitle>
            </div>
            <CardDescription className="text-sm leading-6 text-slate-300">{copy.evidenceBody}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p>
                OECD also reports that immigrants on average generate less public revenue per person at entry than the native-born, while public spending per person is also somewhat lower. That is why composition matters more than slogans.
              </p>
              <div className="mt-3">
                <a
                  href={COMMON_SOURCES.oecdFiscal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-200 underline decoration-slate-500 underline-offset-4"
                >
                  {COMMON_SOURCES.oecdFiscal.label}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p>
                Entry wages are often lower for new migrants in many OECD countries, which is a practical reason why a large low-skill inflow tends to start with a weaker tax base.
              </p>
              <div className="mt-3">
                <a
                  href={COMMON_SOURCES.oecdWages.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-200 underline decoration-slate-500 underline-offset-4"
                >
                  {COMMON_SOURCES.oecdWages.label}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-950">{copy.safetyTitle}</CardTitle>
          <CardDescription className="text-sm leading-6">{copy.safetySubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {copy.safetyMetrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{metric.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{metric.detail}</p>
                <div className="mt-3">
                  <SourceLink source={metric.source} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-300/80 bg-gradient-to-br from-white via-white to-slate-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-slate-700" />
            <CardTitle className="text-xl text-slate-950">{copy.scenarioTitle}</CardTitle>
          </div>
          <CardDescription className="text-sm leading-6">{copy.scenarioSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{copy.arrivalsLabel}</p>
                    <p className="mt-1 text-sm text-slate-600">{copy.arrivalsHelp}</p>
                  </div>
                  <p className="text-3xl font-semibold text-slate-950">{arrivals.toLocaleString(locale === 'lv' ? 'lv-LV' : 'en-US')}</p>
                </div>
                <div className="mt-5">
                  <Slider
                    value={[arrivals]}
                    min={0}
                    max={100000}
                    step={5000}
                    onValueChange={(value) => setArrivals(value[0] ?? 0)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-950">{copy.skillLabel}</p>
                <div className="mt-3">
                  <Select value={skillProfile} onValueChange={(value: SkillProfile) => setSkillProfile(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{copy.skillOptions.low}</SelectItem>
                      <SelectItem value="mixed">{copy.skillOptions.mixed}</SelectItem>
                      <SelectItem value="high">{copy.skillOptions.high}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.workParticipation}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{Math.round(scenario.employmentRate * 100)}%</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.estimatedWorkers}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{formatCompact(scenario.workers, locale)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.taxTake}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{formatCurrency(scenario.taxTake, locale)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.serviceCost}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{formatCurrency(scenario.serviceCost, locale)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white">
              <div className="flex items-center gap-2">
                <BadgeEuro className="h-5 w-5 text-slate-200" />
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">{copy.firstYearNet}</p>
              </div>
              <p className="mt-4 text-4xl font-semibold">
                {scenario.netEffect >= 0 ? '+' : ''}
                {formatCurrency(scenario.netEffect, locale)}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{copy.fiscalSubtitle}</p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                {locale === 'lv'
                  ? 'Ja scenārijs ir pārsvarā zemākas kvalifikācijas un ļoti liels, fiskālais efekts sākumā parasti kļūst sliktāks, jo nodokļu bāze aug lēnāk nekā pakalpojumu un administrēšanas izmaksas.'
                  : 'If the scenario is mostly lower-skill and very large, the early fiscal picture usually worsens because the tax base grows more slowly than service and administrative cost.'}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-5 w-5 text-slate-700" />
                  <CardTitle className="text-xl text-slate-950">{copy.jobsTitle}</CardTitle>
                </div>
                <CardDescription className="text-sm leading-6">{copy.jobsSubtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {scenario.sectors.map((sector) => (
                  <div key={sector.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">{sector.label}</p>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{sector.value}%</p>
                        <p className="text-xs text-slate-500">
                          {Math.round((scenario.workers * sector.value) / 100).toLocaleString(locale === 'lv' ? 'lv-LV' : 'en-US')}
                        </p>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${sector.value}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <SourceLink source={COMMON_SOURCES.emShortages} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl text-slate-950">{copy.beneficiariesTitle}</CardTitle>
                <CardDescription className="text-sm leading-6">{copy.beneficiariesSubtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {copy.beneficiaries.map((item, index) => (
                  <div key={item.title} className="space-y-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                      <div className="mt-3">
                        <SourceLink source={item.source} />
                      </div>
                    </div>
                    {index < copy.beneficiaries.length - 1 ? <Separator /> : null}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl text-slate-950">{copy.labourSlackTitle}</CardTitle>
                <CardDescription className="text-sm leading-6">{copy.labourSlackSubtitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  {copy.labourSlackMetrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
                      <p className="mt-3 text-2xl font-semibold text-slate-950">{metric.value}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{metric.detail}</p>
                      <div className="mt-3">
                        <SourceLink source={metric.source} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl text-slate-950">{copy.unemploymentTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                      {copy.unemploymentTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.unemploymentBody}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-700" />
                  <CardTitle className="text-xl text-slate-950">{copy.institutionsTitle}</CardTitle>
                </div>
                <CardDescription className="text-sm leading-6">{copy.institutionsSubtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {scenario.institutionLoads.map((item, index) => (
                  <div key={item.key} className="space-y-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                            <Badge
                              variant="outline"
                              className={
                                item.sourceType === 'observed_signal'
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  : 'border-amber-300 bg-amber-50 text-amber-800'
                              }
                            >
                              {item.sourceType === 'observed_signal' ? copy.observedTag : copy.modeledTag}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                          {item.sourceType === 'modeled_assumption' ? (
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {locale === 'lv'
                                ? `Formula: (${arrivals.toLocaleString('lv-LV')} / 10 000) × ${item.ratioPer10k} = ${item.extraFte.toFixed(1)} FTE`
                                : `Formula: (${arrivals.toLocaleString('en-US')} / 10,000) × ${item.ratioPer10k} = ${item.extraFte.toFixed(1)} FTE`}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {locale === 'lv'
                                ? 'Balstīts uz novērotu Latvijas administratīvās slodzes signālu, bet joprojām nav pilna oficiāla FTE sērija.'
                                : 'Based on an observed Latvia administrative-load signal, but still not a full official FTE time series.'}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.extraFte}</p>
                          <p className="mt-2 text-xl font-semibold text-slate-950">{item.extraFte.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.extraBudget}</p>
                          <p className="mt-2 text-xl font-semibold text-slate-950">{formatCurrency(item.extraBudget, locale)}</p>
                        </div>
                      </div>
                    </div>
                    {index < scenario.institutionLoads.length - 1 ? <Separator /> : null}
                  </div>
                ))}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.extraBudget}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(scenario.totalInstitutionBudget, locale)}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {locale === 'lv'
                      ? 'Kopsumma ietver modelētus pieņēmumus policijai un tiesām; to nedrīkst lasīt kā oficiālu budžeta prasību.'
                      : 'This total includes modeled assumptions for police and courts and should not be read as an official budget requirement.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">{copy.secondaryInstitutionsTitle}</CardTitle>
              <CardDescription className="text-sm leading-6">{copy.secondaryInstitutionsSubtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.csddTitle}</p>
                    <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">
                      {copy.csddTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.csddBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.csddForeignLicence} />
                    <SourceLink source={COMMON_SOURCES.csddLicenceExchange} />
                    <SourceLink source={COMMON_SOURCES.csddThirdCountryVehicle} />
                    <SourceLink source={COMMON_SOURCES.lsmUkraineLicence} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.municipalPoliceTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.municipalPoliceTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.municipalPoliceBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.lsmRigaIllegalParking} />
                    <SourceLink source={COMMON_SOURCES.csddThirdCountryVehicle} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.roadPoliceTitle}</p>
                    <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">
                      {copy.roadPoliceTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.roadPoliceBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.mfaThirdCountryVehicles} />
                    <SourceLink source={COMMON_SOURCES.lsmForeignVehiclesPunished} />
                    <SourceLink source={COMMON_SOURCES.csddThirdCountryVehicle} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.pvdTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.pvdTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.pvdBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.lsmPvdCouriers} />
                    <SourceLink source={COMMON_SOURCES.lsmPvdInspections} />
                    <SourceLink source={COMMON_SOURCES.pvdFoodRegister} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.ptacTitle}</p>
                    <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">
                      {copy.ptacTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.ptacBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.emPtacBasket} />
                    <SourceLink source={COMMON_SOURCES.ptacFuelMonitoring} />
                    <SourceLink source={COMMON_SOURCES.ptacConsumerProtection} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.ngoTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.ngoTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.ngoBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.lsmRefugeeSupport65m} />
                    <SourceLink source={COMMON_SOURCES.esFondiSifAmif} />
                    <SourceLink source={COMMON_SOURCES.lsmZiedot} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.universitiesTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.universitiesTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.universitiesBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.studyInLatviaBestPractice} />
                    <SourceLink source={COMMON_SOURCES.lsmForeignStudentsRsu} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.housingTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.housingTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.housingBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.lsmStudentHousing} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.socialHousingTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.socialHousingTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.socialHousingBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.lsmRefugeeSupport65m} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.healthcareTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.healthcareTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.healthcareBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.lsmHealthAndBenefits} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.vidTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.vidTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.vidBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.lsmVidEconomicActivity} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.transportTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.transportTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.transportBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.lsmRigaTransport2025} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.enclaveTitle}</p>
                    <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">
                      {copy.enclaveTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.enclaveBody}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.hospitalTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.hospitalTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.hospitalBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.lsmForeignStudentsRsu} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.labourTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.labourTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.labourBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.studyInLatviaBestPractice} />
                    <SourceLink source={COMMON_SOURCES.lsmForeignStudentsRsu} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.incomeFloorTitle}</p>
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                      {copy.incomeFloorTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.incomeFloorBody}</p>
                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    {locale === 'lv'
                      ? 'Labākais tehniskais variants būtu slieksni piesaistīt deklarētajai darba bāzei un VSAA iemaksām, nevis vienkārši formālam darba līgumam.'
                      : 'The cleanest technical version would tie the rule to declared earnings and social-insurance contributions, not just to a formal job contract.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.educationTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.educationTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.educationBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.izmUkraineTeachers} />
                    <SourceLink source={COMMON_SOURCES.lsmUkrainianCamps} />
                    <SourceLink source={COMMON_SOURCES.lsmLatvianLessons} />
                    <SourceLink source={COMMON_SOURCES.lsmSchoolYear2025} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.wasteTitle}</p>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      {copy.wasteTag}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy.wasteBody}</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <SourceLink source={COMMON_SOURCES.lsmIllegalWaste} />
                    <SourceLink source={COMMON_SOURCES.vvdAsbestosScale} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">{copy.comparativeRiskTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-amber-300 bg-white/80 text-amber-900">
                    {copy.comparativeRiskTag}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{copy.comparativeRiskBody}</p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <SourceLink source={COMMON_SOURCES.dwBkaSexualViolence} />
                  <SourceLink source={COMMON_SOURCES.oecdGermanyForeignBorn} />
                  <SourceLink source={COMMON_SOURCES.braCrimePrevention} />
                  <SourceLink source={COMMON_SOURCES.nlDomesticViolence} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">{copy.swedenInstitutionsTitle}</CardTitle>
              <CardDescription className="text-sm leading-6">{copy.swedenInstitutionsSubtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">
                    {copy.swedenInstitutionsTag}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {copy.swedenInstitutions.map((item) => (
                    <div key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-4">
                  <SourceLink source={COMMON_SOURCES.braCrimePrevention} />
                  <SourceLink source={COMMON_SOURCES.nlDomesticViolence} />
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Alert className="border-amber-300/80 bg-amber-50 text-amber-950">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <AlertTitle className="text-sm font-semibold">{copy.honestyTitle}</AlertTitle>
        <AlertDescription className="text-sm text-amber-900">{copy.honestyBody}</AlertDescription>
      </Alert>

      <Alert className="border-slate-300/80 bg-slate-50 text-slate-900">
        <AlertTriangle className="h-4 w-4 text-slate-700" />
        <AlertTitle className="text-sm font-semibold">
          {locale === 'lv' ? 'Par policijas un tiesu skaitļiem' : 'About the police and court numbers'}
        </AlertTitle>
        <AlertDescription className="text-sm text-slate-700">
          {locale === 'lv'
            ? 'Pašlaik mēs neesam atraduši publisku Latvijas statistiku, kas dotu tiešu pārrēķinu no migrantu skaita uz papildu policijas vai tiesu FTE. Tāpēc šīs rindas ir atstātas tikai kā caurspīdīgi modelēti pieņēmumi ar redzamu formulu.'
            : 'At the moment, we have not found public Latvian statistics that directly convert migrant inflow into extra police or court FTE. These rows are therefore kept only as transparent modeled assumptions with the formula shown.'}
        </AlertDescription>
      </Alert>

      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-700" />
            <CardTitle className="text-xl text-slate-950">{copy.assumptionsTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {copy.assumptions.map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
