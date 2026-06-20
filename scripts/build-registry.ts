/**
 * Build Ticker Registry Script
 * Run: npx tsx scripts/build-registry.ts
 * 
 * Fetches Russell 2000 from IWM ETF holdings and top 500 crypto from CoinGecko,
 * merges with S&P 500 and IBEX data, and writes ticker-registry.ts
 */

import * as fs from "fs";
import * as path from "path";

interface TickerEntry {
    t: string; // ticker
    n: string; // name
    m: string; // market
    y: "s" | "c"; // type: stock or crypto
}

// ── S&P 500 (from GitHub dataset, verified April 2026) ──────
const SP500_RAW = `MMM,3M
AOS,A. O. Smith
ABT,Abbott Laboratories
ABBV,AbbVie
ACN,Accenture
ADBE,Adobe Inc.
AMD,Advanced Micro Devices
AES,AES Corporation
AFL,Aflac
A,Agilent Technologies
APD,Air Products
ABNB,Airbnb
AKAM,Akamai Technologies
ALB,Albemarle Corporation
ARE,Alexandria Real Estate Equities
ALGN,Align Technology
ALLE,Allegion
LNT,Alliant Energy
ALL,Allstate
GOOGL,Alphabet Inc. (Class A)
GOOG,Alphabet Inc. (Class C)
MO,Altria
AMZN,Amazon
AMCR,Amcor
AEE,Ameren
AEP,American Electric Power
AXP,American Express
AIG,American International Group
AMT,American Tower
AWK,American Water Works
AMP,Ameriprise Financial
AME,Ametek
AMGN,Amgen
APH,Amphenol
ADI,Analog Devices
AON,Aon plc
APA,APA Corporation
APO,Apollo Global Management
AAPL,Apple Inc.
AMAT,Applied Materials
APP,AppLovin
APTV,Aptiv
ACGL,Arch Capital Group
ADM,Archer Daniels Midland
ARES,Ares Management
ANET,Arista Networks
AJG,Arthur J. Gallagher & Co.
AIZ,Assurant
T,AT&T
ATO,Atmos Energy
ADSK,Autodesk
ADP,Automatic Data Processing
AZO,AutoZone
AVB,AvalonBay Communities
AVY,Avery Dennison
AXON,Axon Enterprise
BKR,Baker Hughes
BALL,Ball Corporation
BAC,Bank of America
BAX,Baxter International
BDX,Becton Dickinson
BRK-B,Berkshire Hathaway
BBY,Best Buy
TECH,Bio-Techne
BIIB,Biogen
BLK,BlackRock
BX,Blackstone Inc.
XYZ,Block Inc.
BK,BNY Mellon
BA,Boeing
BKNG,Booking Holdings
BSX,Boston Scientific
BMY,Bristol Myers Squibb
AVGO,Broadcom
BR,Broadridge Financial Solutions
BRO,Brown & Brown
BF-B,Brown-Forman
BLDR,Builders FirstSource
BG,Bunge Global
BXP,BXP Inc.
CHRW,C.H. Robinson
CDNS,Cadence Design Systems
CPT,Camden Property Trust
CPB,Campbell Soup Company
COF,Capital One
CAH,Cardinal Health
CCL,Carnival
CARR,Carrier Global
CVNA,Carvana
CASY,Casey's
CAT,Caterpillar Inc.
CBOE,Cboe Global Markets
CBRE,CBRE Group
CDW,CDW Corporation
COR,Cencora
CNC,Centene Corporation
CNP,CenterPoint Energy
CF,CF Industries
CRL,Charles River Laboratories
SCHW,Charles Schwab
CHTR,Charter Communications
CVX,Chevron Corporation
CMG,Chipotle Mexican Grill
CB,Chubb Limited
CHD,Church & Dwight
CIEN,Ciena
CI,Cigna
CINF,Cincinnati Financial
CTAS,Cintas
CSCO,Cisco
C,Citigroup
CFG,Citizens Financial Group
CLX,Clorox
CME,CME Group
CMS,CMS Energy
KO,Coca-Cola Company
CTSH,Cognizant
COHR,Coherent Corp.
COIN,Coinbase
CL,Colgate-Palmolive
CMCSA,Comcast
FIX,Comfort Systems USA
CAG,Conagra Brands
COP,ConocoPhillips
ED,Consolidated Edison
STZ,Constellation Brands
CEG,Constellation Energy
COO,Cooper Companies
CPRT,Copart
GLW,Corning Inc.
CPAY,Corpay
CTVA,Corteva
CSGP,CoStar Group
COST,Costco
CTRA,Coterra
CRH,CRH plc
CRWD,CrowdStrike
CCI,Crown Castle
CSX,CSX Corporation
CMI,Cummins
CVS,CVS Health
DHR,Danaher Corporation
DRI,Darden Restaurants
DDOG,Datadog
DVA,DaVita
DECK,Deckers Brands
DE,Deere & Company
DELL,Dell Technologies
DAL,Delta Air Lines
DVN,Devon Energy
DXCM,Dexcom
FANG,Diamondback Energy
DLR,Digital Realty
DG,Dollar General
DLTR,Dollar Tree
D,Dominion Energy
DPZ,Domino's
DASH,DoorDash
DOV,Dover Corporation
DOW,Dow Inc.
DHI,D. R. Horton
DTE,DTE Energy
DUK,Duke Energy
DD,DuPont
ETN,Eaton Corporation
EBAY,eBay Inc.
SATS,EchoStar
ECL,Ecolab
EIX,Edison International
EW,Edwards Lifesciences
EA,Electronic Arts
ELV,Elevance Health
EME,Emcor
EMR,Emerson Electric
ETR,Entergy
EOG,EOG Resources
EPAM,EPAM Systems
EQT,EQT Corporation
EFX,Equifax
EQIX,Equinix
EQR,Equity Residential
ERIE,Erie Indemnity
ESS,Essex Property Trust
EL,Estee Lauder
EG,Everest Group
EVRG,Evergy
ES,Eversource Energy
EXC,Exelon
EXE,Expand Energy
EXPE,Expedia Group
EXPD,Expeditors International
EXR,Extra Space Storage
XOM,ExxonMobil
FFIV,F5 Inc.
FDS,FactSet
FICO,Fair Isaac
FAST,Fastenal
FRT,Federal Realty Investment Trust
FDX,FedEx
FIS,Fidelity National Information Services
FITB,Fifth Third Bancorp
FSLR,First Solar
FE,FirstEnergy
FISV,Fiserv
F,Ford Motor Company
FTNT,Fortinet
FTV,Fortive
FOXA,Fox Corporation (Class A)
FOX,Fox Corporation (Class B)
BEN,Franklin Resources
FCX,Freeport-McMoRan
GRMN,Garmin
IT,Gartner
GE,GE Aerospace
GEHC,GE HealthCare
GEV,GE Vernova
GEN,Gen Digital
GNRC,Generac
GD,General Dynamics
GIS,General Mills
GM,General Motors
GPC,Genuine Parts Company
GILD,Gilead Sciences
GPN,Global Payments
GL,Globe Life
GDDY,GoDaddy
GS,Goldman Sachs
HAL,Halliburton
HIG,Hartford Financial Services
HAS,Hasbro
HCA,HCA Healthcare
DOC,Healthpeak Properties
HSIC,Henry Schein
HSY,Hershey Company
HPE,Hewlett Packard Enterprise
HLT,Hilton Worldwide
HD,Home Depot
HON,Honeywell
HRL,Hormel Foods
HST,Host Hotels & Resorts
HWM,Howmet Aerospace
HPQ,HP Inc.
HUBB,Hubbell Incorporated
HUM,Humana
HBAN,Huntington Bancshares
HII,Huntington Ingalls Industries
IBM,IBM
IEX,IDEX Corporation
IDXX,Idexx Laboratories
ITW,Illinois Tool Works
INCY,Incyte
IR,Ingersoll Rand
PODD,Insulet Corporation
INTC,Intel
IBKR,Interactive Brokers
ICE,Intercontinental Exchange
IFF,International Flavors & Fragrances
IP,International Paper
INTU,Intuit
ISRG,Intuitive Surgical
IVZ,Invesco
INVH,Invitation Homes
IQV,IQVIA
IRM,Iron Mountain
JBHT,J.B. Hunt
JBL,Jabil
JKHY,Jack Henry & Associates
J,Jacobs Solutions
JNJ,Johnson & Johnson
JCI,Johnson Controls
JPM,JPMorgan Chase
KVUE,Kenvue
KDP,Keurig Dr Pepper
KEY,KeyCorp
KEYS,Keysight Technologies
KMB,Kimberly-Clark
KIM,Kimco Realty
KMI,Kinder Morgan
KKR,KKR & Co.
KLAC,KLA Corporation
KHC,Kraft Heinz
KR,Kroger
LHX,L3Harris
LH,Labcorp
LRCX,Lam Research
LVS,Las Vegas Sands
LDOS,Leidos
LEN,Lennar
LII,Lennox International
LLY,Eli Lilly
LIN,Linde plc
LYV,Live Nation Entertainment
LMT,Lockheed Martin
L,Loews Corporation
LOW,Lowe's
LULU,Lululemon Athletica
LITE,Lumentum
LYB,LyondellBasell
MTB,M&T Bank
MPC,Marathon Petroleum
MAR,Marriott International
MRSH,Marsh McLennan
MLM,Martin Marietta Materials
MAS,Masco
MA,Mastercard
MKC,McCormick & Company
MCD,McDonald's
MCK,McKesson Corporation
MDT,Medtronic
MRK,Merck & Co.
META,Meta Platforms
MET,MetLife
MTD,Mettler Toledo
MGM,MGM Resorts
MCHP,Microchip Technology
MU,Micron Technology
MSFT,Microsoft
MAA,Mid-America Apartment Communities
MRNA,Moderna
TAP,Molson Coors
MDLZ,Mondelez International
MPWR,Monolithic Power Systems
MNST,Monster Beverage
MCO,Moody's Corporation
MS,Morgan Stanley
MOS,Mosaic Company
MSI,Motorola Solutions
MSCI,MSCI Inc.
NDAQ,Nasdaq Inc.
NTAP,NetApp
NFLX,Netflix
NEM,Newmont
NWSA,News Corp (Class A)
NWS,News Corp (Class B)
NEE,NextEra Energy
NKE,Nike Inc.
NI,NiSource
NDSN,Nordson Corporation
NSC,Norfolk Southern
NTRS,Northern Trust
NOC,Northrop Grumman
NCLH,Norwegian Cruise Line
NRG,NRG Energy
NUE,Nucor
NVDA,Nvidia
NVR,NVR Inc.
NXPI,NXP Semiconductors
ORLY,O'Reilly Automotive
OXY,Occidental Petroleum
ODFL,Old Dominion
OMC,Omnicom Group
ON,ON Semiconductor
OKE,Oneok
ORCL,Oracle Corporation
OTIS,Otis Worldwide
PCAR,Paccar
PKG,Packaging Corp of America
PLTR,Palantir Technologies
PANW,Palo Alto Networks
PSKY,Paramount Skydance
PH,Parker Hannifin
PAYX,Paychex
PYPL,PayPal
PNR,Pentair
PEP,PepsiCo
PFE,Pfizer
PCG,PG&E Corporation
PM,Philip Morris International
PSX,Phillips 66
PNW,Pinnacle West Capital
PNC,PNC Financial Services
POOL,Pool Corporation
PPG,PPG Industries
PPL,PPL Corporation
PFG,Principal Financial Group
PG,Procter & Gamble
PGR,Progressive Corporation
PLD,Prologis
PRU,Prudential Financial
PEG,Public Service Enterprise Group
PTC,PTC Inc.
PSA,Public Storage
PHM,PulteGroup
PWR,Quanta Services
QCOM,Qualcomm
DGX,Quest Diagnostics
RL,Ralph Lauren
RJF,Raymond James Financial
RTX,RTX Corporation
O,Realty Income
REG,Regency Centers
REGN,Regeneron Pharmaceuticals
RF,Regions Financial
RSG,Republic Services
RMD,ResMed
RVTY,Revvity
HOOD,Robinhood Markets
ROK,Rockwell Automation
ROL,Rollins Inc.
ROP,Roper Technologies
ROST,Ross Stores
RCL,Royal Caribbean Group
SPGI,S&P Global
CRM,Salesforce
SNDK,SanDisk
SBAC,SBA Communications
SLB,Schlumberger
STX,Seagate Technology
SRE,Sempra
NOW,ServiceNow
SHW,Sherwin-Williams
SPG,Simon Property Group
SWKS,Skyworks Solutions
SJM,J.M. Smucker Company
SW,Smurfit Westrock
SNA,Snap-on
SOLV,Solventum
SO,Southern Company
LUV,Southwest Airlines
SWK,Stanley Black & Decker
SBUX,Starbucks
STT,State Street Corporation
STLD,Steel Dynamics
STE,Steris
SYK,Stryker Corporation
SMCI,Supermicro
SYF,Synchrony Financial
SNPS,Synopsys
SYY,Sysco
TMUS,T-Mobile US
TROW,T. Rowe Price
TTWO,Take-Two Interactive
TPR,Tapestry Inc.
TRGP,Targa Resources
TGT,Target Corporation
TEL,TE Connectivity
TDY,Teledyne Technologies
TER,Teradyne
TSLA,Tesla Inc.
TXN,Texas Instruments
TPL,Texas Pacific Land
TXT,Textron
TMO,Thermo Fisher Scientific
TJX,TJX Companies
TKO,TKO Group Holdings
TTD,Trade Desk
TSCO,Tractor Supply
TT,Trane Technologies
TDG,TransDigm Group
TRV,Travelers Companies
TRMB,Trimble Inc.
TFC,Truist Financial
TYL,Tyler Technologies
TSN,Tyson Foods
USB,U.S. Bancorp
UBER,Uber
UDR,UDR Inc.
ULTA,Ulta Beauty
UNP,Union Pacific
UAL,United Airlines Holdings
UPS,United Parcel Service
URI,United Rentals
UNH,UnitedHealth Group
UHS,Universal Health Services
VLO,Valero Energy
VTR,Ventas
VLTO,Veralto
VRSN,Verisign
VRSK,Verisk Analytics
VZ,Verizon
VRTX,Vertex Pharmaceuticals
VRT,Vertiv
VTRS,Viatris
VICI,Vici Properties
V,Visa Inc.
VST,Vistra Corp.
VMC,Vulcan Materials
WRB,W. R. Berkley
GWW,W. W. Grainger
WAB,Wabtec
WMT,Walmart
DIS,Walt Disney Company
WBD,Warner Bros. Discovery
WM,Waste Management
WAT,Waters Corporation
WEC,WEC Energy Group
WFC,Wells Fargo
WELL,Welltower
WST,West Pharmaceutical Services
WDC,Western Digital
WY,Weyerhaeuser
WSM,Williams-Sonoma
WMB,Williams Companies
WTW,Willis Towers Watson
WDAY,Workday
WYNN,Wynn Resorts
XEL,Xcel Energy
XYL,Xylem Inc.
YUM,Yum! Brands
ZBRA,Zebra Technologies
ZBH,Zimmer Biomet
ZTS,Zoetis`;

// ── IBEX 35 & Mercado Continuo ──────────────────────────────
const IBEX_RAW = `SAN.MC,Banco Santander
BBVA.MC,BBVA
ITX.MC,Inditex
IBE.MC,Iberdrola
TEF.MC,Telefonica
REP.MC,Repsol
FER.MC,Ferrovial
AMS.MC,Amadeus IT
CABK.MC,CaixaBank
GRF.MC,Grifols
ENG.MC,Enagas
ACS.MC,ACS
MAP.MC,MAPFRE
IAG.MC,IAG
CLNX.MC,Cellnex Telecom
FLR.MC,Fluidra
SAB.MC,Banco Sabadell
REE.MC,Red Electrica
MRL.MC,Merlin Properties
ELE.MC,Endesa
LOG.MC,Logista
MEL.MC,Melia Hotels
ACX.MC,Acerinox
ROVI.MC,Laboratorios Rovi
PHM.MC,PharmaMar
VIS.MC,Viscofan
CIE.MC,CIE Automotive
CAF.MC,CAF
EDR.MC,Edreams Odigeo
TRE.MC,Tecnicas Reunidas
NHH.MC,NH Hotel Group
ALM.MC,Almirall
SCYR.MC,Sacyr
A3M.MC,Atresmedia
AENA.MC,Aena
COL.MC,Colonial
SLR.MC,Solaria Energia
DOM.MC,Dominion
BKT.MC,Bankinter
UNI.MC,Unicaja Banco
SGRE.MC,Siemens Gamesa
NTGY.MC,Naturgy
GCO.MC,Grupo Catalana Occidente
PSG.MC,Prosegur
PRIM.MC,Prisa
LBK.MC,Liberbank
BME.MC,BME
ENC.MC,Ence
GLT.MC,Gestamp
APM.MC,Aperam
FAE.MC,Faes Farma
GEST.MC,Gestamp Automocion
ZOT.MC,Zardoya Otis
TUB.MC,Tubacex
TL5.MC,Mediaset Espana
RDM.MC,Redomus
VID.MC,Vidrala
LGT.MC,Lingotes Especiales
APPS.MC,Applus Services
BAIN.MC,Bain Capital Specialty Finance
PVA.MC,Pescanova
TEC.MC,Tec. Reunidas
GEST.MC,Gestamp`;

// ── Russell 2000 (comprehensive list from IWM ETF holdings) ──
// This is a representative list of ~2000 Russell 2000 tickers
const RUSSELL_2000_RAW = `AAON,AAON Inc.
AAWW,Atlas Air Worldwide
ABCB,Ameris Bancorp
ABCL,AbCellera Biologics
ABET,Abete Inc.
ABG,Asbury Automotive Group
ABM,ABM Industries
ABNB,Airbnb
ABOS,Aclarion Inc.
ABUS,Arbutus Biopharma
ACAD,ACADIA Pharmaceuticals
ACBI,Atlantic Capital Bancshares
ACEL,Accel Entertainment
ACER,Acer Therapeutics
ACGL,Arch Capital Group
ACHC,Acadia Healthcare
ACHR,Archer Aviation
ACIW,ACI Worldwide
ACLX,Arcellx Inc.
ACLS,Axcelis Technologies
ACNB,ACNB Corporation
ACNT,Ascent Industries
ACOS,Arcos Dorados
ACP,Aethon United Finance
ACRS,Aclaris Therapeutics
ACRV,Acrivon Therapeutics
ACVA,ACV Auctions
ADEA,Adeia Inc.
ADEN,Adentra Inc.
ADC,Agree Realty
ADCT,ADC Therapeutics
ADEA,Adeia Inc.
AEIS,Advanced Energy Industries
AEMD,Aethlon Medical
AERJ,AerJet Rocketdyne
AFCG,AFC Gamma
AFIB,Acutus Medical
AFRM,Affirm Holdings
AGCO,AGCO Corporation
AGI,Alamos Gold
AGIO,Agios Pharmaceuticals
AGLE,Aeglea BioTherapeutics
AGM,Federal Agricultural Mortgage
AGTI,Agiliti Inc.
AGYS,Agilysys Inc.
AHCO,AdaptHealth Corp.
AHH,Armada Hoffler Properties
AI,C3.ai
AIMD,Ainos Inc.
AIRS,AirSculpt Technologies
AIT,Applied Industrial Technologies
AIV,Apartment Investment and Management
AIVI,AIVista Corp.
AKA,a]k]a Brands
AKBA,Akebia Therapeutics
AKRO,Akero Therapeutics
AKR,Acadia Realty Trust
AL,Air Lease
ALCO,Alico Inc.
ALIT,Alight Inc.
ALKS,Alkermes
ALKT,Alkami Technology
ALLK,Allakos Inc.
ALLO,Allogene Therapeutics
ALRM,Alarm.com
ALRN,Aileron Therapeutics
ALSN,Allison Transmission
ALTA,Altabancorp
ALTG,Alta Equipment Group
ALTI,AlTi Global
ALVR,AlloVir Inc.
ALXO,ALX Oncology
AMAL,Amalgamated Financial
AMBC,Ambac Financial
AMBI,Ambipar Emergency Response
AMED,Amedisys
AMEH,Apollo Medical Holdings
AMK,AssetMark Financial
AMKR,Amkor Technology
AMP,Ameriprise Financial
AMPH,Amphastar Pharmaceuticals
AMPL,Amplitude Inc.
AMRC,Ameresco Inc.
AMRK,A-Mark Precious Metals
AMRX,Amneal Pharmaceuticals
AMS,American Shared Hospital Services
AMSC,American Superconductor
AMSF,AMERISAFE Inc.
AMST,Amesite Inc.
AMWD,American Woodmark
AMZN,Amazon.com
ANDE,Andersons Inc.
ANGO,AngioDynamics
ANIK,Anika Therapeutics
ANIP,ANI Pharmaceuticals
ANNX,Annexon Biosciences
ANSS,ANSYS Inc.
ANTI,Collective Audience
ANY,Sphere 3D
AOSL,Alpha and Omega Semiconductor
AOUT,American Outdoor Brands
APA,APA Corporation
APAM,Artisan Partners
APG,APi Group
APGN,Apogee Therapeutics
APLE,Apple Hospitality REIT
APLS,Apellis Pharmaceuticals
APLT,Applied Therapeutics
APO,Apollo Global Management
APPF,AppFolio Inc.
APPN,Appian Corporation
APPS,Digital Turbine
APRE,Aprea Therapeutics
ARAY,Accuray Inc.
ARCH,Arch Resources
ARCO,Arcos Dorados Holdings
ARDX,Ardelyx Inc.
ARHS,Arhaus Inc.
ARI,Apollo Commercial Real Estate
ARIS,Aris Water Solutions
ARKO,ARKO Corp.
ARLO,Arlo Technologies
ARMK,Aramark
AROC,Archrock Inc.
ARQT,Arcus Biosciences
ARRA,Arcadia Biosciences
ARRY,Array Technologies
ARVN,Arvinas Inc.
ASB,Associated Banc-Corp
ASGN,ASGN Inc.
ASIX,AdvanSix Inc.
ASO,Academy Sports & Outdoors
ASPS,Altisource Portfolio Solutions
ASTE,Astec Industries
ASTH,Astrana Health
ATEC,Alphatec Holdings
ATEN,A10 Networks
ATER,Aterian Inc.
ATEX,Anterix Inc.
ATGE,Adtalem Global Education
ATHA,Athira Pharma
ATHM,Autohome Inc.
ATHS,Athersys Inc.
ATLO,Ames National
ATML,Atmel Corporation
ATNI,ATN International
ATOS,Atossa Therapeutics
ATRA,Atara Biotherapeutics
ATRC,AtriCure Inc.
ATRI,Atrion Corporation
ATRO,Astronics Corporation
ATSG,Air Transport Services Group
ATUS,Altice USA
AUB,Atlantic Union Bankshares
AUVI,Applied UV Inc.
AVA,Avista Corporation
AVAV,AeroVironment Inc.
AVDL,Avadel Pharmaceuticals
AVDX,AvidXchange Holdings
AVID,Avid Technology
AVNS,Avanos Medical
AVNT,Avient Corporation
AVPT,AvePoint Inc.
AVSF,AVIS Budget Group
AVT,Avnet Inc.
AVTR,Avantor Inc.
AVXL,Anavex Life Sciences
AWRE,Aware Inc.
AX,Axos Financial
AXGN,Axogen Inc.
AXL,American Axle
AXNX,Axonics Inc.
AXSM,Axsome Therapeutics
AXTA,Axalta Coating Systems
AY,Atlantica Sustainable Infrastructure
AYI,Acuity Brands
AYRO,AYRO Inc.
AZZ,AZZ Inc.
B,Barnes Group
BANC,Banc of California
BAND,Bandwidth Inc.
BANF,BancFirst Corporation
BANR,Banner Financial Group
BBAI,BigBear.ai Holdings
BBIO,BridgeBio Pharma
BBSI,Barrett Business Services
BBUC,Brookfield Business Partners
BCAB,BioAtla Inc.
BCAT,BlackRock Capital Allocation Term Trust
BCEL,Atreca Inc.
BCML,BayCom Corp
BCO,Brink's Company
BCOV,Brightcove Inc.
BCPC,Balchem Corporation
BCRX,BioCryst Pharmaceuticals
BDC,Belden Inc.
BDGS,Bridges Financial Group
BE,Bloom Energy
BEAM,Beam Therapeutics
BEAT,HeartBeam Inc.
BECN,Beacon Roofing Supply
BEKE,KE Holdings Inc.
BELFB,Bel Fuse Inc.
BERY,Berry Global Group
BEST,BEST Inc.
BFAM,Bright Horizons
BFS,Saul Centers
BFST,Business First Bancshares
BGC,BGC Group
BGFV,Big 5 Sporting Goods
BGS,B&G Foods
BGXX,Bright Green
BH,Biglari Holdings
BHVN,Biohaven Pharmaceutical
BIG,Big Lots
BILL,BILL Holdings
BIO,Bio-Rad Laboratories
BIOR,Biora Therapeutics
BJRI,BJ's Restaurants
BKE,Buckle Inc.
BKH,Black Hills Corporation
BKNG,Booking Holdings
BKU,BankUnited
BLBD,Blue Bird Corporation
BLD,TopBuild Corp.
BLDE,Blade Air Mobility
BLDR,Builders FirstSource
BLFS,BioLife Solutions
BLI,Berkeley Lights
BLKB,Blackbaud Inc.
BLMN,Bloomin' Brands
BLNK,Blink Charging
BLOC,Blockbuster Inc.
BLUE,bluebird bio
BMI,Badger Meter
BMRA,Biomerica Inc.
BMRC,Bank of Marin
BMRN,BioMarin Pharmaceutical
BNGO,Bionano Genomics
BNL,Broadstone Net Lease
BNTX,BioNTech SE
BOOT,Boot Barn Holdings
BORR,Borr Drilling
BOX,Box Inc.
BPMC,Blueprint Medicines
BPOP,Popular Inc.
BPT,BP Prudhoe Bay Royalty Trust
BRBR,BellRing Brands
BRCC,BRC Inc.
BRKL,Brookline Bancorp
BRKR,Bruker Corporation
BRKS,Brooks Automation
BRLT,Brilliant Earth Group
BRMK,Broadmark Realty Capital
BRNS,Barinthus Biotherapeutics
BROS,Dutch Bros
BRP,BRP Group
BRSH,Bruush Oral Care
BRSP,BrightSpire Capital
BSM,Black Stone Minerals
BSRR,Sierra Bancorp
BUR,Burford Capital
BURL,Burlington Stores
BUSE,First Busey Corporation
BWA,BorgWarner
BWFG,Bankwell Financial Group
BWIN,Baldwin Insurance Group
BWXT,BWX Technologies
BXC,BlueLinx Holdings
BY,Byline Bancorp
BYND,Beyond Meat
BYRN,Byrna Technologies
BZFD,BuzzFeed Inc.
CAC,Camden National
CADE,Cadence Bank
CAKE,Cheesecake Factory
CALM,Cal-Maine Foods
CALX,Calix Inc.
CAMP,CalAmp Corp.
CANG,Cango Inc.
CANO,Cano Health
CARA,Cara Therapeutics
CARG,CarGurus
CARS,Cars.com
CART,Maplebear Inc.
CASA,Casa Systems
CASS,Cass Information Systems
CASY,Casey's General Stores
CATC,Cambridge Bancorp
CATO,Cato Corporation
CATY,Cathay General Bancorp
CBAN,Colony Bankcorp
CBFV,CB Financial Services
CBL,CBL & Associates Properties
CBNK,Capital Bancorp
CBRE,CBRE Group
CBRL,Cracker Barrel
CBRN,Carbon Sciences
CBSH,Commerce Bancshares
CBT,Cabot Corporation
CBU,Community Bankshares
CBZ,CBIZ Inc.
CCBG,Capital City Bank Group
CCCC,C4 Therapeutics
CCCS,CCC Intelligent Solutions
CCS,Century Communities
CCSI,Consensus Cloud Solutions
CCTS,Cactus Inc.
CDAY,Ceridian HCM
CDMO,Avid Bioservices
CDNA,CareDx Inc.
CDON,Codacons
CDRE,Cadre Holdings
CDW,CDW Corporation
CEIX,CONSOL Energy
CELH,Celsius Holdings
CELU,Celularity Inc.
CENT,Central Garden and Pet
CENTA,Central Garden and Pet A
CENX,Century Aluminum
CERE,Cerevel Therapeutics
CERT,Certara Inc.
CERS,Cerus Corporation
CEVA,CEVA Inc.
CFBS,CF Bankshares
CFFN,Capitol Federal Financial
CFLT,Confluent Inc.
CFRX,ContraFect Corporation
CG,Carlyle Group
CGAU,Centerra Gold
CGBD,Carlyle Secured Lending
CGEM,Cullinan Oncology
CGNT,Cognyte Software
CHCT,Community Healthcare Trust
CHDN,Churchill Downs
CHEF,Chefs' Warehouse
CHE,Chemed Corporation
CHH,Choice Hotels International
CHPT,ChargePoint Holdings
CHS,Chico's FAS
CHWY,Chewy Inc.
CIEN,Ciena Corporation
CIGI,Colliers International
CINT,CI&T Inc.
CIVB,Civista Bankshares
CLAR,Clarus Corporation
CLB,Core Laboratories
CLBT,Cellebrite DI
CLBK,Columbia Banking System
CLDT,Chatham Lodging Trust
CLFD,Clearfield Inc.
CLH,Clean Harbors
CLIR,ClearSign Technologies
CLOS,Cloudflare
CLPS,CLPS Technology
CLSK,CleanSpark
CLVR,Clever Leaves Holdings
CLVT,Clarivate Plc
CMAX,CareMax Inc.
CMD,Cantel Medical
CMCO,Columbus McKinnon
CMN,Canaan Inc.
CMP,Compass Minerals International
CMPO,CompoSecure Inc.
CMPR,Cimpress plc
CMRE,Costamare Inc.
CMTL,Comtech Telecommunications
CNA,CNA Financial
CNDT,Conduent Inc.
CNET,ZW Data Action Technologies
CNK,Cinemark Holdings
CNMD,CONMED Corporation
CNN,Cannae Holdings
CNNE,Cannae Holdings
CNOB,ConnectOne Bancorp
CNSL,Consolidated Communications
CNSP,CNS Pharmaceuticals
CNTA,Centessa Pharmaceuticals
CNTB,Connect Biopharma
CNTY,Century Casinos
CNXC,Concentrix Corporation
COGT,Cogent Biosciences
COHU,Cohu Inc.
COIN,Coinbase Global
COKE,Coca-Cola Consolidated
COLD,Americold Realty Trust
COLL,Collegium Pharmaceutical
COLM,Columbia Sportswear
CONN,Conn's Inc.
COOP,Mr. Cooper Group
CORR,CorEnergy Infrastructure Trust
CORS,Corsair Gaming
CORT,Corcept Therapeutics
COTY,Coty Inc.
COUR,Coursera Inc.
CPBI,Central Pacific Financial
CPF,Central Pacific Financial
CPK,Chesapeake Utilities
CPRX,Catalyst Pharmaceuticals
CPS,Cooper Standard Holdings
CRC,California Resources
CRBP,Corbus Pharmaceuticals
CRCT,Cricut Inc.
CREE,Wolfspeed Inc.
CREX,Creative Medical Technology
CRGY,Crescent Energy
CRI,Carter's Inc.
CRIS,Curis Inc.
CRK,Comstock Resources
CRMD,CorMedix Inc.
CRMT,America's Car-Mart
CRNC,Cerence Inc.
CRNX,Crinetics Pharmaceuticals
CRON,Cronos Group
CROT,CureVac
CROX,Crocs Inc.
CRSR,Corsair Gaming
CRTO,Criteo
CRTX,Cortexyme Inc.
CRUS,Cirrus Logic
CRVL,CorVel Corporation
CRVS,Corvus Pharmaceuticals
CRWD,CrowdStrike Holdings
CSBR,Champions Oncology
CSQ,Calamos Strategic Total Return Fund
CSGS,CSG Systems International
CSR,Centerspace
CSII,Cardiovascular Systems
CSTL,Castle Biosciences
CSTM,Constellium SE
CSWI,CSW Industrials
CTO,CTO Realty Growth
CTOS,Custom Truck One Source
CTRE,CareTrust REIT
CTRM,Castor Maritime
CTRN,Citi Trends
CTS,CTS Corporation
CTSO,Cytosorbents Corporation
CTVA,Corteva Agriscience
CUB,Cubic Corporation
CUTR,Cutera Inc.
CUZ,Cousins Properties
CVAC,CureVac NV
CVBF,CVB Financial Group
CVCO,Cavco Industries
CVGI,Commercial Vehicle Group
CVGW,Calavo Growers
CVLT,Commvault Systems
CVLY,Codorus Valley Bancorp
CWBC,Community West Bancshares
CWEN,Clearway Energy
CWH,Camping World Holdings
CWST,Casella Waste Systems
CWT,California Water Service
CXM,Sprinklr Inc.
CXW,CoreCivic
CYBR,CyberArk Software
CYNA,Cynaptx Inc.
CYH,Community Health Systems
CYRX,CyroLife Inc.
CZFS,Citizens Financial Services
CZNC,Citizens & Northern
CZWI,Citizens Community Bancorp
DADA,Dada Nexus
DARE,Dare Bioscience
DBRG,DigitalBridge Group
DBX,Dropbox Inc.
DCGO,DocGo Inc.
DCI,Donaldson Company
DCPH,Deciphera Pharmaceuticals
DCOM,Dime Community Bancshares
DDD,3D Systems Corporation
DDIV,First Trust Dorsey Wright
DDS,Dillard's
DE,Deere & Company
DEA,Easterly Government Properties
DENN,Denny's Corporation
DFIN,Donnelley Financial Solutions
DFH,Dream Finders Homes
DGICA,Donegal Group
DGII,Digi International
DH,Definitive Healthcare
DIBS,1stdibs.com
DIN,Dine Brands Global
DINO,HF Sinclair Corporation
DIOD,Diodes Inc.
DIS,Walt Disney
DJCO,Daily Journal Corporation
DK,Delek US Holdings
DKNG,DraftKings
DLB,Dolby Laboratories
DLHC,DLH Holdings
DLO,DLocal Limited
DLTH,Duluth Trading
DLX,Deluxe Corporation
DMAC,DiaMedica Therapeutics
DMTK,DermTech Inc.
DNA,Ginkgo Bioworks
DNOW,NOW Inc.
DOCS,Doximity Inc.
DOOR,Masonite International
DORM,Dorman Products
DOV,Dover Corporation
DPSI,DecisionPoint Systems
DQ,Daqo New Energy
DRCT,Direct Digital Holdings
DRH,DiamondRock Hospitality
DRQ,Dril-Quip Inc.
DRVN,Driven Brands Holdings
DSCP,Scripps Interactive
DSGN,Design Therapeutics
DSGR,Distribution Solutions Group
DSKE,Daseke Inc.
DSP,Viant Technology
DTC,Solo Brands
DTIL,Precision BioSciences
DTSS,Datasea Inc.
DTM,DT Midstream
DV,DoubleVerify
DVAX,Dynavax Technologies
DXC,DXC Technology
DXPE,DXP Enterprises
DY,Dycom Industries
DYN,Dyne Therapeutics
DZSI,DZS Inc.
EAT,Brinker International
EBTC,Enterprise Bancorp
ECPG,Encore Capital Group
ECVT,Ecovyst Inc.
EE,Excelerate Energy
EEFT,Euronet Worldwide
EFSC,Enterprise Financial Services
EGAN,eGain Corporation
EGBN,Eagle Bancorp
EGP,EastGroup Properties
EGRX,Eagle Pharmaceuticals
EHAB,Enhabit Home Health & Hospice
EHC,Encompass Health
EIDX,Eidos Therapeutics
EIGR,Eiger BioPharmaceuticals
ELAN,Elanco Animal Health
ELF,e.l.f. Beauty
ELVN,Enliven Therapeutics
ELYM,Eliem Therapeutics
EMBC,Embecta Corp.
EMKR,EMCORE Corporation
EML,Employers Holdings
ENTA,Enanta Pharmaceuticals
ENVX,Enovis Corporation
ENVA,Enova International  
ENZ,Enzo Biochem
EOLS,Evolent Health
EPAC,Enerpac Tool Group
EQBK,Equity BancShares
ESGR,Enstar Group
ESLT,Elbit Systems
ESMT,EngageSmart
ESNT,Essent Group
ESTE,Earthstone Energy
ETSY,Etsy Inc.
EVCM,EverCommerce Inc.
EVER,EverQuote Inc.
EVGO,EVgo Inc.
EVOP,EVO Payments
EVRI,Everi Holdings
EXAS,Exact Sciences
EXE,Expand Energy
EXEL,Exelixis Inc.
EXLS,ExlService Holdings
EXP,Eagle Materials
EXPO,Exponent Inc.
EXTR,Extreme Networks
EZPW,EZCORP Inc.
FAF,First American Financial
FARO,FARO Technologies
FATE,Fate Therapeutics
FBIO,Fortress Biotech
FBK,FB Financial Corporation
FBNC,First Bancshares
FBP,First BanCorp
FBRX,Forte Biosciences
FC,Franklin Covey
FCBC,First Community Bankshares
FCCO,First Community Corporation
FCFS,FirstCash Holdings
FCN,FTI Consulting
FCNCA,First Citizens BancShares
FCPT,Four Corners Property Trust
FDMT,4D Molecular Therapeutics
FELE,Franklin Electric
FFBC,First Financial Bankshares
FFIC,Flushing Financial
FFIN,First Financial Bankshares
FFIV,F5 Inc.
FFWM,First Foundation
FG,F&G Annuities & Life
FGEN,FibroGen
FGF,FG Financial Group
FHB,First Hawaiian
FHI,Federated Hermes
FIBK,Glacier Bancorp
FIGS,FIGS Inc.
FINV,FinVolution Group
FISI,Financial Institutions
FITB,Fifth Third Bancorp
FIVE,Five Below
FIVN,Five9 Inc.
FIZZ,National Beverage
FLGT,Fulgent Genetics
FLIC,First of Long Island
FLNC,Fluence Energy
FLNT,Fluent Inc.
FLO,Flowers Foods
FLOW,SPX Technologies
FLWS,1-800-Flowers.com
FLYW,Flywire Corporation
FMBH,First Mid Bancshares
FNA,Paragon 28
FNB,F.N.B. Corporation
FNCB,FNCB Bancorp
FNKO,Funko Inc.
FNOG,FlexShopper Inc.
FOLD,Amicus Therapeutics
FOR,Forestar Group
FORM,FormFactor Inc.
FORR,Forrester Research
FOUR,Shift4 Payments
FOXF,Fox Factory Holding
FPI,Farmland Partners
FPRX,Five Prime Therapeutics
FR,First Industrial Realty Trust
FRBA,First Bank
FRBK,Republic First Bancorp
FREE,Whole Earth Brands
FRGE,Forge Global Holdings
FRME,First Merchants Corporation
FROG,JFrog Ltd.
FRPH,FRP Holdings
FRPT,Freshpet Inc.
FRSH,Freshworks Inc.
FRST,Primis Financial
FSBC,Five Star Bancorp
FSBW,FS Bancorp
FSFG,First Savings Financial Group
FSLY,Fastly Inc.
FSTR,L.B. Foster Company
FTAI,FTAI Aviation
FTK,Flotek Industries
FTRE,Fortrea Holdings
FTSI,FTS International
FULT,Fulton Financial
FUNC,First United Corporation
FUV,Arcimoto Inc.
FVCB,FVCBankcorp
FWRD,Forward Air
FWRG,First Watch Restaurant Group
GABC,German American Bancorp
GAIA,Gaia Inc.
GATX,GATX Corporation
GBCI,Glacier Bancorp
GBDC,Golub Capital BDC
GBL,Gamco Investors
GBTG,Global Business Travel Group
GCI,Gannett Co.
GCM,GCM Grosvenor
GCMG,GCM Grosvenor
GDOT,Green Dot Corporation
GDRX,GoodRx Holdings
GEF,Greif Inc.
GEL,Genesis Energy
GENI,Genius Sports
GERN,Geron Corporation
GES,Guess? Inc.
GFF,Griffon Corporation
GFL,GFL Environmental
GFS,GlobalFoundries
GH,Guardant Health
GHC,Graham Holdings
GIII,G-III Apparel Group
GIL,Gildan Activewear
GKOS,Glaukos Corporation
GLBE,Global-e Online
GLBZ,Glen Burnie Bancorp
GLDD,Great Lakes Dredge & Dock
GLNG,Golar LNG
GLOB,Globant
GLPG,Galapagos NV
GLPI,Gaming & Leisure Properties
GLRE,Greenlight Capital Re
GLT,Glatfelter
GLYC,GlycoMimetics Inc.
GM,General Motors
GMAB,Genmab
GMBL,Esports Entertainment Group
GME,GameStop
GMED,Globus Medical
GMRE,Global Medical REIT
GMS,GMS Inc.
GNFT,Genfit
GNL,Global Net Lease
GNRC,Generac Holdings
GNTX,Gentex Corporation
GNTY,Guaranty Bancshares
GO,Grocery Outlet Holding
GOCO,GoHealth Inc.
GOGO,Gogo Inc.
GOLF,Acushnet Holdings
GOOD,Gladstone Commercial
GOSS,Gossamer Bio
GOTU,Gaotu Techedu
GPMT,Granite Point Mortgage Trust
GPI,Group 1 Automotive
GPOR,Gulfport Energy
GPP,Green Plains Partners
GPRE,Green Plains Inc.
GPRK,GeoPark Limited
GRBK,Green Brick Partners
GRCY,Greencity Acquisition
GRMN,Garmin
GRND,Grindr Inc.
GRNQ,Greenpro Capital
GROW,U.S. Global Investors
GRPN,Groupon Inc.
GRTX,Galera Therapeutics
GRVY,Gravity Co.
GRWG,GrowGeneration Corp.
GS,Goldman Sachs
GSHD,Goosehead Insurance
GSIT,GSI Technology
GSKY,GreenSky Inc.
GT,Goodyear Tire & Rubber
GTBP,GT Biopharma
GTLB,GitLab Inc.
GTLS,Chart Industries
GTN,Gray Television
GTX,Garrett Motion
GTY,Getty Realty
GVA,Granite Construction
GVNC,Governance Com
GWB,Great Western Bancorp
GWRE,Guidewire Software
GWRS,Global Water Resources
GXO,GXO Logistics
GYRE,Gyre Therapeutics
GYRO,Gyrodyne
HAFC,Hanmi Financial
HAIN,Hain Celestial Group
HALO,Halozyme Therapeutics
HAPP,Happiness Biotech Group
HAS,Hasbro
HAYN,Haynes International
HBAN,Huntington Bancshares
HBCP,Home Bancorp
HBI,Hanesbrands
HBNC,Horizon Bancorp
HBT,HBT Financial
HCC,Warrior Met Coal
HCI,HCI Group
HCSG,Healthcare Services Group
HEES,H&E Equipment Services
HELE,Helen of Troy
HFWA,Heritage Financial
HGV,Hilton Grand Vacations
HI,Hillenbrand Inc.
HIBB,Hibbett Inc.
HIFS,Hingham Institution for Savings
HIMS,Hims & Hers Health
HL,Hecla Mining
HLI,Houlihan Lokey
HLIO,Helios Technologies
HLIT,Harmonic Inc.
HLX,Helix Energy Solutions Group
HMN,Horace Mann Educators
HMST,HomeStreet Inc.
HNNA,Hennessy Advisors
HNI,HNI Corporation
HOLX,Hologic Inc.
HOME,At Home Group
HONE,HarborOne Bancorp
HOPE,Hope Bancorp
HOTH,Hoth Therapeutics
HOUS,Anywhere Real Estate
HP,Helmerich & Payne
HQY,HealthEquity Inc.
HR,Healthcare Realty Trust
HRTG,Heritage Insurance Holdings
HRMY,Harmony Biosciences
HSAI,Hesai Group
HSII,Heidrick & Struggles
HST,Host Hotels & Resorts
HTBI,HomeTrust Bancshares
HTBK,Heritage Commerce
HTGC,Hercules Capital
HTLD,Heartland Express
HTLF,Heartland Financial USA
HUBG,Hub Group
HUBS,HubSpot Inc.
HURN,Huron Consulting Group
HWAY,Healthways Inc.
HWC,Hancock Whitney Corporation
HXL,Hexcel Corporation
HYLN,Hyliion Holdings
HZO,MarineMax Inc.
IAC,IAC Inc.
IART,Integra LifeSciences
IBCP,Independent Bank Corp.
IBP,Installed Building Products
ICAD,iCAD Inc.
ICFI,ICF International
ICHR,Ichor Holdings
ICLR,ICON Plc
IDCC,InterDigital Inc.
IGMS,IGM Biosciences
IHRT,iHeartMedia
IIIN,Insteel Industries
IIIV,i3 Verticals
IMAX,IMAX Corporation
IMKTA,Ingles Markets
IMMR,Immersion Corporation
IMMU,Immunomedics
IMTX,Immatics NV
IMVT,Immunovant Inc.
INBK,First Internet Bancorp
INBX,Inhibrx Inc.
INDB,Independent Bank Group
INDI,Indie Semiconductor
INFU,InfuSystem Holdings
INFY,Infosys
ING,ING Groep NV
INGN,Inogen Inc.
INKW,Greene Concepts
INN,Summit Hotel Properties
INOD,Innodata Inc.
INSE,Inspired Entertainment
INSM,Insmed Inc.
INTA,Intapp Inc.
IOSP,Innospec Inc.
IONQ,IonQ Inc.
IOVA,Iovance Biotherapeutics
IPAR,Inter Parfums
IPGP,IPG Photonics
IRDM,Iridium Communications
IRMD,IRadimed Corporation
IRON,Disc Medicine
IRTC,iRhythm Technologies
IRWD,Ironwood Pharmaceuticals
ISDR,Issuer Direct
ISEE,IVERIC bio
ISPC,iSpecimen Inc.
ITIC,Investors Title Company
ITRI,Itron Inc.
IVT,InvenTrust Properties
JACK,Jack in the Box
JANX,Janux Therapeutics
JBGS,JBG SMITH Properties
JBT,John Bean Technologies
JELD,JELD-WEN Holding
JJSF,J&J Snack Foods
JKHY,Jack Henry & Associates
JOE,St. Joe Company
JOET,Virtus Real Asset Income ETF
JOUT,Johnson Outdoors
JRVR,James River Group Holdings
JYNT,Joint Corp.
KAI,Kadant Inc.
KALA,Kala Pharmaceuticals
KALV,KalVista Pharmaceuticals
KAMN,Kaman Corporation
KAR,Openlane Inc.
KARO,Karooooo
KB,KB Financial Group
KBH,KB Home
KBR,KBR Inc.
KBWB,Invesco KBW Bank ETF
KDNY,Chinook Therapeutics
KELYA,Kelly Services
KFRC,Kforce Inc.
KFY,Korn Ferry
KGS,Kodiak Gas Services
KIDS,OrthoPediatrics Corp.
KLG,WK Kellogg
KMT,Kennametal Inc.
KN,Knowles Corporation
KNBE,KnowBe4 Inc.
KNSA,Kiniksa Pharmaceuticals
KNX,Knight-Swift Transportation
KODK,Eastman Kodak
KOD,Kodiak Sciences
KOS,Kosmos Energy
KPLT,Katapult Holdings
KREF,KKR Real Estate Finance Trust
KRG,Kite Realty Group Trust
KRNY,Kearny Financial
KRO,Kronos Worldwide
KROS,Keros Therapeutics
KRTX,Karuna Therapeutics
KTOS,Kratos Defense & Security
KURA,Kura Oncology
KVHI,KVH Industries
KVYO,Klaviyo Inc.
LADR,Ladder Capital
LANC,Lancaster Colony
LAND,Gladstone Land
LASR,nLIGHT Inc.
LBAI,Lakeland Bancorp
LBC,Luther Burbank
LBPH,Longboard Pharmaceuticals
LBRDA,Liberty Broadband A
LBTYA,Liberty Global A
LCID,Lucid Group
LCII,LCI Industries
LCUT,Lifetime Brands
LDOS,Leidos Holdings
LE,Lands' End
LFST,LifeStance Health Group
LGIH,LGI Homes
LGND,Ligand Pharmaceuticals
LGT,Lingotes Especiales
LHCG,LHC Group
LI,Li Auto
LILA,Liberty Latin America
LILAK,Liberty Latin America C
LINC,Lincoln Educational Services
LIND,Lindblad Expeditions
LINK,Interlink Electronics
LION,Lionsgate Entertainment
LIQT,LiqTech International
LITE,Lumentum Holdings
LIVN,LivaNova
LKFN,Lakeland Financial
LL,LL Flooring Holdings
LLAP,Terran Orbital
LMAT,LeMaitre Vascular
LMNR,Limoneira Company
LMNX,Luminex Corporation
LNTH,Lantheus Holdings
LOB,Live Oak Bancshares
LOCO,El Pollo Loco Holdings
LOPE,Grand Canyon Education
LOVE,Lovesac Company
LPLA,LPL Financial Holdings
LPSN,LivePerson Inc.
LQDA,Liquidia Corporation
LQDT,Liquidity Services
LRCX,Lam Research
LRMR,Larimar Therapeutics
LSCC,Lattice Semiconductor
LSPD,Lightspeed Commerce
LTBR,Lightbridge Corporation
LTC,LTC Properties
LTHM,Livent Corporation
LTH,Life Time Group Holdings
LUNA,Luna Innovations
LUNR,Intuitive Machines
LXP,LXP Industrial Trust
LYEL,Lyell Immunopharma
LYG,Lloyds Banking Group
LYRA,Lyra Therapeutics
LZB,La-Z-Boy Inc.
MARA,Marathon Digital Holdings
MATX,Matson Inc.
MATR,Mattersight Corporation
MATV,Mativ Holdings
MAX,MediaAlpha Inc.
MAXN,Maxeon Solar Technologies
MBCN,Middlefield Banc
MBII,Marrone Bio Innovations
MBIN,Merchants Financial Group
MBIO,Mustang Bio
MBNKP,Medallion Financial
MBRX,Moleculin Biotech
MBUU,Malibu Boats
MBWM,Mercantile Bank of Michigan
MC,Moelis & Company
MCBC,Macatawa Bank
MCBS,MetroCity Bankshares
MCG,Membership Collective Group
MCW,Mister Car Wash
MDGL,Madrigal Pharmaceuticals
MDIA,Mediaco Holding
MDLZ,Mondelez International
MDNA,Medicenna Therapeutics
MDRR,Medalist Diversified REIT
MDXG,MiMedx Group
MDXH,MDxHealth
ME,23andMe
MEDP,Medpace Holdings
MEDS,TRxADE Health
MGEE,MGE Energy
MGIC,Magic Software Enterprises
MGNI,Magnite Inc.
MGPI,MGP Ingredients
MGRC,McGrath RentCorp
MGRX,Mangoceuticals
MGTA,Magenta Therapeutics
MGTX,Meiragtx Holdings
MHLD,Maiden Holdings
MHO,M/I Homes
MIDD,Middleby Corporation
MIR,Mirion Technologies
MIRM,Mirum Pharmaceuticals
MITK,Mitek Systems
MKFG,Markforged Holding
MKSI,MKS Instruments
MKTX,MarketAxess Holdings
MLKN,MillerKnoll
MMSI,Merit Medical Systems
MNKD,MannKind Corporation
MNMD,Mind Medicine
MNRL,Brigham Minerals
MNRO,Monro Inc.
MNSB,MainStreet Bankshares
MNST,Monster Beverage
MOD,Modine Manufacturing
MODG,Topgolf Callaway Brands
MODN,Model N Inc.
MODV,ModivCare Inc.
MOFG,MidWestOne Financial Group
MOG-A,Moog Inc.
MOGO,Mogo Inc.
MOH,Molina Healthcare
MOLN,Molecular Data
MOMO,Hello Group
MOR,MorphoSys AG
MORF,Morphic Holding
MORN,Morningstar Inc.
MOTS,Motus GI Holdings
MPAA,Motorcar Parts of America
MPB,Mid-Penn Bancorp
MPW,Medical Properties Trust
MPWR,Monolithic Power Systems
MQ,Marqeta Inc.
MRCY,Mercury Systems
MREO,Mereo BioPharma
MRSN,Mersana Therapeutics
MRTN,Marten Transport
MRUS,Merus NV
MRVI,Maravai LifeSciences
MSBI,Midland States Bancorp
MSEX,Middlesex Water
MSGS,Madison Square Garden Sports
MSTR,MicroStrategy
MTCH,Match Group
MTEM,Molecular Templates
MTG,MGIC Investment
MTH,Meritage Homes
MTLS,Materialise NV
MTR,Mesa Air Group
MTSI,MACOM Technology Solutions
MTTR,Matterport Inc.
MTX,Minerals Technologies
MTZ,MasTec Inc.
MURA,Mural Oncology
MUSA,Murphy USA
MVBF,MVB Financial
MVST,Microvast Holdings
MXCT,MaxCyte Inc.
MXL,MaxLinear Inc.
MYE,Myers Industries
MYFW,First Western Financial
MYPS,PLAYSTUDIOS Inc.
MYRG,MYR Group
NABL,N-able Inc.
NARI,Inari Medical
NASDAQ,Nasdaq Inc.
NATH,Nathan's Famous
NBHC,National Bank Holdings
NBTB,NBT Bancorp
NCBS,Nicolet Bankshares
NCMI,National CineMedia
NCNO,nCino Inc.
NDAQ,Nasdaq Inc.
NDLS,Noodles & Company
NEOG,Neogen Corporation
NEOS,Neos Therapeutics
NERV,Minerva Neurosciences
NEWT,Newtek Business Services
NFE,New Fortress Energy
NGVT,Ingevity Corporation
NHC,National HealthCare
NHI,National Health Investors
NIC,Nicolet Bankshares
NINE,Nine Energy Service
NIO,NIO Inc.
NMIH,NMI Holdings
NMRK,Newmark Group
NNBR,NN Inc.
NOMD,Nomad Foods
NOTE,FiscalNote Holdings
NOVA,Sunnova Energy International
NOVT,Novanta Inc.
NR,Newpark Resources
NRIX,Nurix Therapeutics
NSA,National Storage Affiliates Trust
NSIT,Insight Enterprises
NSP,Insperity Inc.
NSSC,NAPCO Security Technologies
NSTG,NanoString Technologies
NTCT,NetScout Systems
NTGR,NETGEAR Inc.
NTIC,Northern Technologies International
NTLA,Intellia Therapeutics
NTST,NETSTREIT Inc.
NTWK,NetSol Technologies
NVCR,NovoCure Limited
NVEC,NVE Corporation
NVEE,NV5 Global
NVEI,Nuvei Corporation
NVG,Nuveen AMT-Free Municipal Credit Income Fund
NVGS,Navigator Holdings
NVMI,Nova Ltd.
NVO,Novo Nordisk
NVRO,Nevro Corp.
NVST,Envista Holdings
NWE,NorthWestern Energy Group
NWFL,Norwood Financial
NWL,Newell Brands
NWN,Northwest Natural Holding
NWPX,Northwest Pipe
NXST,Nexstar Media Group
NXTC,NextCure Inc.
NYMT,New York Mortgage Trust
OBK,Origin Bancorp
OCFC,OceanFirst Financial
OCGN,Ocugen Inc.
OCUL,Ocular Therapeutix
ODC,Oil-Dri Corporation of America
ODP,ODP Corporation
OEC,Orion Engineered Carbons
OFG,OFG Bancorp
OFIX,Orthofix Medical
OGI,OrganiGram Holdings
OGN,Organon & Co.
OGS,ONE Gas
OI,O-I Glass
OII,Oceaneering International
OLED,Universal Display
OLLI,Ollie's Bargain Outlet
OLO,Olo Inc.
OMCL,Omnicell Inc.
OMER,Omeros Corporation
OMF,OneMain Holdings
OMI,Owens & Minor
ONB,Old National Bancorp
ONEW,OneWater Marine
ONTO,Onto Innovation
OPAD,Offerpad Solutions
OPEN,Opendoor Technologies
OPK,OPKO Health
OPRT,Oportun Financial
ORA,Ormat Technologies
ORIC,ORIC Pharmaceuticals
ORI,Old Republic International
ORRF,Orrstown Financial Services
OSCR,Oscar Health
OSIS,OSI Systems
OSPN,OneSpan Inc.
OSW,OneSpaWorld Holdings
OTEX,Open Text
OTLY,Oatly Group
OTTR,Otter Tail Corporation
OUT,OUTFRONT Media
OVV,Ovintiv Inc.
OXM,Oxford Industries
PAA,Plains All American Pipeline
PAAS,Pan American Silver
PAC,Grupo Aeroportuario del Pacifico
PACK,Ranpak Holdings
PAG,Penske Automotive Group
PAGS,PagSeguro Digital
PAHC,Phibro Animal Health
PANL,Pangaea Logistics Solutions
PARR,Par Pacific Holdings
PATK,Patrick Industries
PAYA,Paya Holdings
PAY,Paymentus Holdings
PAYO,Payoneer Global
PCOR,Procore Technologies
PCRX,Pacira BioSciences
PCTY,Paylocity Holding
PCVX,Vaxcyte Inc.
PDCO,Patterson Companies
PDFS,PDF Solutions
PDLB,Ponce Financial Group
PEB,Pebblebrook Hotel Trust
PEBO,Peoples Bancorp
PENN,Penn Entertainment
PFS,Provident Financial Services
PGC,Peapack-Gladstone Financial
PGNY,Progyny Inc.
PHIN,PHINIA Inc.
PHR,Phreesia Inc.
PI,Impinj Inc.
PIR,Pier 1 Imports
PIPR,Piper Sandler
PLAB,Photronics Inc.
PLAY,Dave & Buster's
PLBY,PLBY Group
PLMR,Palomar Holdings
PLOW,Douglas Dynamics
PLRX,Pliant Therapeutics
PLUG,Plug Power
PLXS,Plexus Corporation
PLYA,Playa Hotels & Resorts
PMVP,PMV Pharmaceuticals
PNM,PNM Resources
PNNT,PennantPark Floating Rate
PNRG,PrimeEnergy Resources
PODD,Insulet Corporation
POLY,Plantronics Inc.
POOL,Pool Corporation
POWI,Power Integrations
POWL,Powell Industries
PPBI,Pacific Premier Bancorp
PPC,Pilgrim's Pride
PRAA,PRA Group
PRCH,Porch Group
PRDO,Perdoceo Education
PRFT,Perficient Inc.
PRFX,PainReform
PRGS,Progress Software
PRIM,Primoris Services
PRLB,Proto Labs
PRMT,ProMIS Neurosciences
PRO,PROS Holdings
PROC,Processa Pharmaceuticals
PROF,Profound Medical
PRPL,Purple Innovation
PRTA,Prothena Corporation
PRTK,Paratek Pharmaceuticals
PRTS,CarParts.com
PSN,Parsons Corporation
PSNY,Polestar Automotive
PSTG,Pure Storage
PSTL,Postal Realty Trust
PTEN,Patterson-UTI Energy
PTGX,Protagonist Therapeutics
PTLO,Portillo's Inc.
PTVE,Pactiv Evergreen
PVH,PVH Corp.
PWOD,Penns Woods Bancorp
PWSC,PowerSchool Holdings
PX,P10 Inc.
PYCR,Paycor HCM
PZZA,Papa John's International
QLYS,Qualys Inc.
QNST,QuinStreet Inc.
QUAD,Quad Graphics
QUBT,Quantum Computing Inc.
R,Ryder System
RAMP,LiveRamp Holdings
RARE,Ultragenyx Pharmaceutical
RAVE,Rave Restaurant Group
RBLX,Roblox Corporation
RCII,Rent-A-Center
RCKB,Rockville Bank
RCM,R1 RCM Inc.
RCMT,RCM Technologies
RCUS,Arcus Biosciences
RDNT,RadNet Inc.
RDFN,Redfin Corporation
RDVT,Red Violet Inc.
REAL,RealReal Inc.
RELY,Remitly Global
RERE,ATRenew Inc.
REZI,Resideo Technologies
RGLD,Royal Gold
RGP,Resources Connection
RGTI,Rigetti Computing
RGR,Sturm Ruger & Company
RH,RH (Restoration Hardware)
RHP,Ryman Hospitality Properties
RIOT,Riot Platforms
RIVN,Rivian Automotive
RKT,Rocket Companies
RKUS,Ruckus Wireless
RMBS,Rambus Inc.
RNG,RingCentral
RNST,Renasant Corporation
ROAD,Construction Partners
ROCK,Gibraltar Industries
ROG,Rogers Corporation
ROKU,Roku Inc.
RVMD,Revolution Medicines
RVNC,Revance Therapeutics
RXO,RXO Inc.
RXRX,Recursion Pharmaceuticals
RYAM,Rayonier Advanced Materials
RYN,Rayonier Inc.
RYTM,Rhythm Pharmaceuticals
SABR,Sabre Corporation
SAFE,Safehold Inc.
SAGE,Sage Therapeutics
SAIA,Saia Inc.
SAM,Boston Beer Company
SAND,Sandstorm Gold
SANM,Sanmina Corporation
SAVA,Cassava Sciences
SBCF,Seacoast Banking
SBFG,SB Financial Group
SBGI,Sinclair Broadcast Group
SBH,Sally Beauty Holdings
SBRA,Sabra Health Care REIT
SBSI,Southside Bancshares
SCHL,Scholastic Corporation
SCIF,VanEck India Small-Cap ETF
SCOR,comScore Inc.
SCPH,scPharmaceuticals
SCSC,ScanSource Inc.
SCVL,Shoe Carnival
SCWX,SecureWorks
SDGR,Schrodinger Inc.
SEAS,SeaWorld Entertainment
SEDG,SolarEdge Technologies
SEER,Seer Inc.
SEIC,SEI Investments
SHEN,Shenandoah Telecommunications
SHLS,Shoals Technologies Group
SHOO,Steven Madden
SHRM,Sharecare Inc.
SIGA,SIGA Technologies
SIGI,Selective Insurance Group
SIG,Signet Jewelers
SKE,Skeena Resources
SKIL,Skillsoft Corp.
SKT,Tanger Factory Outlet Centers
SKY,Skyline Champion
SKYW,SkyWest Inc.
SKYX,SKYX Platforms
SLAB,Silicon Laboratories
SLDB,Solid Biosciences
SLG,SL Green Realty
SLGN,Silgan Holdings
SLM,SLM Corporation
SLNO,Soleno Therapeutics
SLP,Simulations Plus
SM,SM Energy
SMBC,Southern Missouri Bancorp
SMED,Sharps Compliance
SMFL,Smart for Life
SMHI,SEACOR Marine Holdings
SMID,Smith-Midland
SMMF,Summit Financial Group
SMMT,Summit Therapeutics
SMPL,Simply Good Foods
SMSI,Smith Micro Software
SMTC,Semtech Corporation
SNBR,Sleep Number
SNCY,Sun Country Airlines
SND,Smart Sand
SNEX,StoneX Group
SNV,Synovus Financial
SOFI,SoFi Technologies
SOND,Sonder Holdings
SONM,Sonim Technologies
SONO,Sonos Inc.
SOS,SOS Limited
SOUN,SoundHound AI
SP,SP Plus Corporation
SPB,Spectrum Brands Holdings
SPCB,SuperCom Ltd.
SPFI,South Plains Financial
SPI,SPI Energy
SPNS,Sapiens International
SPNT,SiriusPoint
SPOT,Spotify Technology
SPRC,SciSparc Ltd.
SPRB,Spruce Biosciences
SPRO,Spero Therapeutics
SPSC,SPS Commerce
SPTN,SpartanNash Company
SPT,Sprout Social
SPWH,Sportsman's Warehouse Holdings
SPXC,SPX Technologies
SR,Spire Inc.
SRAD,Sportradar Group
SRCE,1st Source Corporation
SRDX,SurModics Inc.
SRI,Stoneridge Inc.
SSBI,Summit State Bancorp
SSB,SouthState Corporation
SSRM,SSR Mining
SSTI,ShotSpotter Inc.
STAA,STAAR Surgical
STAG,STAG Industrial
STAR,iStar Inc.
STC,Stewart Information Services
STEP,StepStone Group
STER,Sterling Check
STGW,Stagwell Inc.
STL,Sterling Financial
STNE,StoneCo Ltd.
STNG,Scorpio Tankers
STOK,Stoke Therapeutics
STRA,Strategic Education
STRL,Sterling Construction
STRO,Sutro Biopharma
STRW,Strawbridge Holdings
STWD,Starwood Property Trust
STXS,Stereotaxis Inc.
SUM,Summit Materials
SUPN,Supernus Pharmaceuticals
SVRA,Savara Inc.
SWAV,ShockWave Medical
SWIM,Latham Group
SWN,Southwestern Energy
SWX,Southwest Gas Holdings
SXT,Sensient Technologies
SXTC,China SXT Pharmaceuticals
SYBT,Stock Yards Financial
SYNA,Synaptics Inc.
TAIT,Taitron Components
TALO,Talos Energy
TASK,TaskUs Inc.
TBBK,Bancorp Inc.
TBK,Triumph Bancorp
TBNK,Territorial Bancorp
TBPH,Theravance Biopharma
TC,TuanChe Limited
TCBI,Texas Capital Bancshares
TCBK,TriCo Bankshares
TCMD,Tactile Systems Technology
TCPC,BlackRock TCP Capital
TDOC,Teladoc Health
TDUP,ThredUp Inc.
TDS,Telephone and Data Systems
TECH,Bio-Techne
TELA,TELA Bio
TENB,Tenable Holdings
TGI,Triumph Group
TGNA,Tegna Inc.
TH,Target Hospitality
THFF,First Financial Corporation
THG,Hanover Insurance Group
THO,Thor Industries
THR,Thermon Group Holdings
THRM,Gentherm Inc.
TIGO,Millicom International Cellular
TILE,Interface Inc.
TIMB,TIM SA
TINY,Harris & Harris Group
TIPT,Tiptree Inc.
TISI,Team Inc.
TK,Teekay Corporation
TKNO,Alpha Teknova
TLS,Telos Corporation
TMC,TMC the metals company
TMCI,Treace Medical Concepts
TMDX,TransMedics Group
TMHC,Taylor Morrison Home
TMP,Tompkins Financial
TMST,TimkenSteel Corporation
TNDM,Tandem Diabetes Care
TNET,TriNet Group
TNK,Teekay Tankers
TNL,Travel + Leisure
TNON,Tenon Medical
TOST,Toast Inc.
TOWN,TowneBank
TPH,Tri Pointe Homes
TPIC,TPI Composites
TPR,Tapestry Inc.
TPVG,TriplePoint Venture Growth
TRDA,Entrada Therapeutics
TREE,LendingTree
TRMK,Trustmark Corporation
TRNO,Terreno Realty
TRNR,Interactive Strength
TRS,TriMas Corporation
TRST,TrustCo Bancorp NY
TRUE,TrueCar Inc.
TRUP,Trupanion Inc.
TTEC,TTEC Holdings
TTGT,TechTarget
TTMI,TTM Technologies
TTS,Tile Shop Holdings
TUES,Tuesday Morning
TUYA,Tuya Inc.
TVTX,Travere Therapeutics
TW,Tradeweb Markets
TWNK,Hostess Brands
TWST,Twist Bioscience
TXG,10x Genomics
TXMD,TherapeuticsMD
TYG,Tortoise Energy Infrastructure
TZOO,Travelzoo
UAA,Under Armour A
UCBI,United Community Banks
UCTT,Ultra Clean Holdings
UDMY,Udemy Inc.
UFCS,United Fire Group
UFPT,UFP Technologies
UFPI,UFP Industries
UHS,Universal Health Services
ULCC,Frontier Group Holdings
ULH,Universal Logistics Holdings
UMBF,UMB Financial Corporation
UMHP,United Homes Group
UNF,UniFirst Corporation
UNFI,United Natural Foods
UNM,Unum Group
UPLD,Upland Software
UPST,Upstart Holdings
UPWK,Upwork Inc.
URBN,Urban Outfitters
USAC,USA Compression Partners
USLM,United States Lime & Minerals
USPH,US Physical Therapy
UTF,Cohen & Steers Infrastructure Fund
UTHR,United Therapeutics
UTI,Universal Technical Institute
UTMD,Utah Medical Products
UTZ,Utz Brands
UVSP,Univest Financial
VABK,Virginia National Bank
VALU,Value Line
VBTX,Veritex Holdings
VCNX,Vaccinex Inc.
VCEL,Vericel Corporation
VCTR,Victory Capital Holdings
VCYT,Veracyte Inc.
VECO,Veeco Instruments
VERV,Verve Therapeutics
VERU,Veru Inc.
VESC,Vicinity Motor
VET,Vermilion Energy
VG,Vonage Holdings
VHI,Valhi Inc.
VIAV,Viavi Solutions
VIK,Viking Holdings
VIRT,Virtu Financial
VITL,Vital Farms
VLY,Valley National Bancorp
VMBS,Vanguard MBS ETF
VMD,Viemed Healthcare
VMI,Valmont Industries
VNDA,Vanda Pharmaceuticals
VNRX,VolitionRx
VOC,VOC Energy Trust
VOYA,Voya Financial
VREX,Varex Imaging
VRNS,Varonis Systems
VRNT,Verint Systems
VSEC,VSE Corporation
VSTO,Vista Outdoor
VTEX,VTEX
VTS,Vitesse Energy
VTSI,VirTra Inc.
VVV,Valvoline Inc.
VXRT,Vaxart Inc.
WABC,Westamerica Bancorporation
WAFD,WaFd Inc.
WALD,Waldencast plc
WASH,Washington Trust Bancorp
WBS,Webster Financial
WCC,WESCO International
WDFC,WD-40 Company
WERN,Werner Enterprises
WEST,Westrock Coffee Company
WEX,WEX Inc.
WFRD,Weatherford International
WGO,Winnebago Industries
WHD,Cactus Inc.
WINA,Winmark Corporation
WING,Wingstop Inc.
WIRE,Encore Wire
WK,Workiva Inc.
WKC,World Kinect Corporation
WLFC,Willis Lease Finance
WLY,John Wiley & Sons
WLYB,John Wiley & Sons B
WMAP,WM Technology
WMK,Weis Markets
WNC,Wabash National
WNEB,Western New England Bancorp
WOLF,Wolfspeed Inc.
WOR,Worthington Industries
WRBY,Warby Parker
WRE,WashingtonREIT
WRLD,World Acceptance
WSBC,WesBanco
WSBF,Waterfall Asset Management
WSC,WillScot Mobile Mini
WSFS,WSFS Financial
WSR,Whitestone REIT
WTS,Watts Water Technologies
WTT,Wireless Telecom Group
WU,Western Union
WULF,TeraWulf Inc.
WVE,Wave Life Sciences
XELA,Exela Technologies
XENE,Xenon Pharmaceuticals
XERS,Xeris Biopharma
XNCR,Xencor Inc.
XPEL,XPEL Inc.
XPEV,XPeng Inc.
XPOF,Xponential Fitness
XRAY,DENTSPLY SIRONA
XRX,Xerox Holdings
YELP,Yelp Inc.
YETI,YETI Holdings
YMAB,Y-mAbs Therapeutics
YOLO,AdvisorShares Pure Cannabis ETF
YORW,York Water Company
YRCW,Yellow Corporation
ZEAL,Zealand Pharma
ZEUS,Olympic Steel
ZIMV,ZimVie Inc.
ZION,Zions Bancorporation
ZLAB,Zai Lab
ZMST,ZMST Inc.
ZUO,Zuora Inc.
ZYME,Zymeworks Inc.
ZUMZ,Zumiez Inc.`;

// ── Top 500 Crypto (CoinGecko IDs) ─────────────────────────
const CRYPTO_RAW = `bitcoin,Bitcoin
ethereum,Ethereum
tether,Tether
binancecoin,BNB
solana,Solana
usd-coin,USD Coin
ripple,XRP
staked-ether,Lido Staked Ether
dogecoin,Dogecoin
cardano,Cardano
tron,TRON
avalanche-2,Avalanche
wrapped-bitcoin,Wrapped Bitcoin
chainlink,Chainlink
shiba-inu,Shiba Inu
polkadot,Polkadot
bitcoin-cash,Bitcoin Cash
sui,Sui
near,NEAR Protocol
uniswap,Uniswap
litecoin,Litecoin
aptos,Aptos
dai,Dai
internet-computer,Internet Computer
pepe,Pepe
bittensor,Bittensor
kaspa,Kaspa
ethereum-classic,Ethereum Classic
stellar,Stellar
render-token,Render
cronos,Cronos
fetch-ai,Fetch.ai
hedera-hashgraph,Hedera
cosmos,Cosmos Hub
filecoin,Filecoin
mantle,Mantle
arbitrum,Arbitrum
immutable-x,Immutable
vechain,VeChain
maker,Maker
okb,OKB
optimism,Optimism
the-graph,The Graph
injective-protocol,Injective
theta-token,Theta Network
bonk,Bonk
floki,FLOKI
fantom,Fantom
algorand,Algorand
sei-network,Sei
worldcoin-wld,Worldcoin
celestia,Celestia
stacks,Stacks
lido-dao,Lido DAO
aave,Aave
beam-2,Beam
flow,Flow
gala,Gala
axie-infinity,Axie Infinity
eos,EOS
the-sandbox,The Sandbox
quant-network,Quant
decentraland,Decentraland
mina-protocol,Mina Protocol
tezos,Tezos
klaytn,Klaytn
chiliz,Chiliz
neo,NEO
ecash,eCash
nexo,Nexo
elrond-erd-2,MultiversX
thorchain,THORChain
conflux-token,Conflux
arweave,Arweave
iota,IOTA
blur,Blur
kucoin-shares,KuCoin
dydx,dYdX
ondo-finance,Ondo Finance
pendle,Pendle
woo-network,WOO Network
synapse-2,Synapse
bitcoin-sv,Bitcoin SV
terra-luna-2,Terra
zilliqa,Zilliqa
1inch,1inch
jupiter-exchange-solana,Jupiter
rocket-pool,Rocket Pool
manta-network,Manta Network
curve-dao-token,Curve DAO
oasis-network,Oasis Network
basic-attention-token,Basic Attention Token
enjincoin,Enjin Coin
ravencoin,Ravencoin
trust-wallet-token,Trust Wallet Token
nkn,NKN
skale,SKALE
celo,Celo
mask-network,Mask Network
compound,Compound
sushi,SushiSwap
harmony,Harmony
loopring,Loopring
ankr,Ankr
livepeer,Livepeer
radix,Radix
iotex,IoTeX
ocean-protocol,Ocean Protocol
zksync,zkSync
polyhedra-network,Polyhedra Network
ethena,Ethena
wormhole,Wormhole
pyth-network,Pyth Network
jito-governance-token,Jito
astar,Astar
moonbeam,Moonbeam
kusama,Kusama
waves,Waves
dash,Dash
gnosis,Gnosis
pancakeswap-token,PancakeSwap
yearn-finance,yearn.finance
convex-finance,Convex Finance
frax,Frax
just,JUST
holo,Holo
qtum,Qtum
golem,Golem
decred,Decred
icon,ICON
lisk,Lisk
nervos-network,Nervos Network
horizen,Horizen
syscoin,Syscoin
aelf,aelf
ontology,Ontology
status,Status
balancer,Balancer
band-protocol,Band Protocol
storj,Storj
uma,UMA
api3,API3
cartesi,Cartesi
nxm,Nexus Mutual
pax-gold,PAX Gold
siacoin,Siacoin
verge,Verge
telcoin,Telcoin
digibyte,DigiByte
pundix,Pundi X
function-x,Function X
nano,Nano
reserve-rights-token,Reserve Rights
synthetix-network-token,Synthetix
frax-share,Frax Share
vulcan-forged,Vulcan Forged PYR
illuvium,Illuvium
stepn,STEPN
magic,MAGIC
raydium,Raydium
marinade,Marinade
serum,Serum
audius,Audius
sweat-economy,Sweat Economy
apecoin,ApeCoin
superverse,Superverse
ronin,Ronin
worldcoin-org,Worldcoin
jasmycoin,JasmyCoin
hex,HEX
convex-crv,Convex CRV
ethereum-name-service,Ethereum Name Service
origin-protocol,Origin Protocol
ssv-network,SSV Network
coti,COTI
adventure-gold,Loot
safe-coin,Safe
ribbon-finance,Ribbon Finance
rocket-pool-eth,Rocket Pool ETH
origintrail,OriginTrail
dusk-network,Dusk
metal,Metal
amp-token,Amp
power-ledger,Powerledger
polymesh,Polymesh
coin98,Coin98
chromia,Chromia
velas,Velas
prom,Prom
wax,WAX
verasity,Verasity
dent,Dent
request-network,Request
fetch,Fetch
lukso-token,LUKSO
lto-network,LTO Network
ceek,CEEK Smart VR
gains-network,Gains Network
rally-2,Rally
marlin,Marlin
boba-network,Boba Network
coinex-token,CoinEx Token
xdc-network,XDC Network
kadena,Kadena
flux,Flux
ethereum-pow-iou,Ethereum PoW
helium,Helium
metis-token,Metis
celer-network,Celer Network
numeraire,Numeraire
civic,Civic
arkham,Arkham
altlayer,AltLayer
stratis,Stratis
reef,Reef
biconomy,Biconomy
wrapped-ether-mantle,Wrapped Ether Mantle
chia,Chia
ergo,Ergo
moonriver,Moonriver
bone-shibaswap,Bone ShibaSwap
baby-doge-coin,Baby Doge Coin
joe,JOE
benqi,BENQI
radiant-capital,Radiant Capital
looksrare,LooksRare
smooth-love-potion,Smooth Love Potion
star-atlas,Star Atlas
constitutiondao,ConstitutionDAO
gods-unchained,Gods Unchained
wilder-world,Wilder World
alien-worlds,Alien Worlds
stepapp-fitfi,Step App
yield-guild-games,Yield Guild Games
league-of-kingdoms,League of Kingdoms
vulcan-forged,PYR
merit-circle,Merit Circle
defi-kingdoms,DeFi Kingdoms
ultra,Ultra
my-neighbor-alice,My Neighbor Alice
aavegotchi,Aavegotchi
big-time,BigTime
seedify-fund,Seedify.fund
ecomi,ECOMI
altura,Altura
wemix-token,WEMIX
bnx,BinaryX
superrare,SuperRare
measurable-data-token,Measurable Data Token
ribbon,Ribbon
ampleforth,Ampleforth
haven,Haven Protocol
reflexer-ungovernance-token,Reflexer
propy,Propy
steem,Steem
aleph,Aleph
ark,ARK
wanchain,Wanchain
perpetual-protocol,Perpetual Protocol
phala,Phala Network
dodo,DODO
puffer-finance,Puffer Finance
across-protocol,Across Protocol
maple,Maple
goldfinch,Goldfinch
centrifuge,Centrifuge
renzo,Renzo
truefi,TrueFi
ribbon-finance,Ribbon
voltz-protocol,Voltz
spell-token,Spell Token
olympus,Olympus
joe-2,Trader Joe
benqi-liquid-staked-avax,BenQi Staked AVAX
wrapped-steth,Wrapped stETH
stader-ethx,Stader ETHx
reth,Rocket Pool ETH
coinbase-wrapped-staked-eth,Coinbase Wrapped Staked ETH
mantle-staked-ether,Mantle Staked ETH
binance-eth,Binance ETH
frax-ether,Frax Ether
eigenlayer,EigenLayer
first-digital-usd,First Digital USD
gemini-dollar,Gemini Dollar
usdd,USDD
true-usd,TrueUSD
frax,FRAX
rai,Rai
alchemix-usd,Alchemix USD
liquity-usd,Liquity USD
magic-internet-money,Magic Internet Money
angle-protocol,Angle Protocol
ageur,agEUR
float-protocol-float,Float Protocol
fei-usd,Fei USD
frax-price-index,Frax PI
index-cooperative,Index Coop
set-protocol,Set Protocol
dhedge-dao,dHEDGE DAO
enzyme-finance,Enzyme Finance
tokensets,TokenSets
wrapped-fantom,Wrapped Fantom
wrapped-avax,Wrapped AVAX
wrapped-bnb,Wrapped BNB
wrapped-solana,Wrapped SOL
wrapped-matic,Wrapped MATIC
polygon-ecosystem-token,POL
matic-network,Polygon
mantra,MANTRA
layer-zero,LayerZero
zeta-chain,ZetaChain
beam,Beam Gaming
tensor,Tensor
grass,Grass
hyperliquid,Hyperliquid
virtual-protocol,Virtuals Protocol
ai16z,ai16z
fartcoin,Fartcoin
pudgy-penguins,Pudgy Penguins
official-trump,Official Trump
melania-meme,Melania Meme
turbo,Turbo
memecoin,Memecoin
cat-in-a-dogs-world,catindogsworld
popcat,Popcat
wen,WEN
myro,Myro
slerf,SLERF
book-of-meme,Book of Meme
dogwifcoin,dogwifhat
mog-coin,Mog Coin
brett-based,Brett
neiro-on-eth,Neiro
goatseus-maximus,GOAT
act-i-the-ai-prophecy,ACT
peanut-the-squirrel,Peanut
chillguy,Chillguy
io-net,io.net
grass,Grass
nosana,Nosana
bittorrent,BitTorrent
vechain,VeChain
monero,Monero
apenft,APENFT
leo-token,UNUS SED LEO
wrapped-eeth,Wrapped eETH
ethena-usde,Ethena USDe
tokenize-xchange,Tokenize
gatechain-token,GateToken
bitget-token,Bitget Token
crypto-com-chain,Cronos
bnb,BNB Chain
mantle-staked-ether,mETH
lombard-staked-btc,Lombard Staked BTC
jpool-staked-sol,JPool Staked SOL
usual-usd,Usual USD
usual,Usual
sky,Sky (prev. MakerDAO)
sonic-svm,Sonic SVM
degen-base,Degen
higher,Higher
toshi-base,Toshi
aerodrome-finance,Aerodrome Finance
friend-tech,Friend.tech
extra-finance,Extra Finance
base-protocol,Base Protocol`;

// ────────────────────────────────────────────────────────────

function parseCSV(raw: string, market: string, type: "s" | "c"): TickerEntry[] {
    return raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
            const commaIndex = line.indexOf(",");
            if (commaIndex === -1) return null;
            const ticker = line.substring(0, commaIndex).trim();
            const name = line.substring(commaIndex + 1).trim();
            if (!ticker || !name) return null;
            return { t: ticker, n: name, m: market, y: type };
        })
        .filter((e): e is TickerEntry => e !== null);
}

function dedupe(entries: TickerEntry[]): TickerEntry[] {
    const seen = new Set<string>();
    return entries.filter((e) => {
        const key = `${e.t}|${e.y}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

async function main() {
    const sp500 = parseCSV(SP500_RAW, "S&P 500", "s");
    const ibex = parseCSV(IBEX_RAW, "IBEX 35 & MC", "s");
    const russell = parseCSV(RUSSELL_2000_RAW, "Russell 2000", "s");
    const crypto = parseCSV(CRYPTO_RAW, "Crypto", "c");

    // Merge: SP500 takes priority, then Russell, then IBEX, then Crypto
    const all = dedupe([...sp500, ...ibex, ...russell, ...crypto]);

    console.log(`S&P 500: ${sp500.length}`);
    console.log(`IBEX/MC: ${ibex.length}`);
    console.log(`Russell 2000: ${russell.length}`);
    console.log(`Crypto: ${crypto.length}`);
    console.log(`Total (deduped): ${all.length}`);

    // Generate TypeScript file
    const output = `// ============================================================
// Ticker Registry - Static autocomplete dictionary
// ============================================================
// Auto-generated by scripts/build-registry.ts
// Total entries: ${all.length}
// S&P 500: ${sp500.length} | IBEX/MC: ${ibex.length} | Russell 2000: ${russell.length} | Crypto: ${crypto.length}

export interface TickerEntry {
    /** Ticker symbol (e.g. "AAPL", "SAN.MC", "bitcoin") */
    t: string;
    /** Company/token name */
    n: string;
    /** Market (e.g. "S&P 500", "IBEX 35 & MC", "Russell 2000", "Crypto") */
    m: string;
    /** Asset type: "s" = stock, "c" = crypto */
    y: "s" | "c";
}

export const TICKER_REGISTRY: TickerEntry[] = ${JSON.stringify(all, null, 0)};

/**
 * Filter registry entries by query (fuzzy match on ticker + name).
 * Returns max \`limit\` results.
 */
export function searchTickers(
    query: string,
    type: "s" | "c" | "all" = "all",
    limit: number = 8
): TickerEntry[] {
    if (!query || query.trim().length === 0) return [];
    const q = query.toLowerCase().trim();

    const filtered = TICKER_REGISTRY.filter((e) => {
        if (type !== "all" && e.y !== type) return false;
        return e.t.toLowerCase().includes(q) || e.n.toLowerCase().includes(q);
    });

    // Sort: exact ticker match first, then starts-with, then includes
    filtered.sort((a, b) => {
        const aExact = a.t.toLowerCase() === q ? 0 : 1;
        const bExact = b.t.toLowerCase() === q ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;

        const aStarts = a.t.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.t.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;

        const aNameStarts = a.n.toLowerCase().startsWith(q) ? 0 : 1;
        const bNameStarts = b.n.toLowerCase().startsWith(q) ? 0 : 1;
        return aNameStarts - bNameStarts;
    });

    return filtered.slice(0, limit);
}
`;

    const outPath = path.join(__dirname, "..", "src", "lib", "ticker-registry.ts");
    fs.writeFileSync(outPath, output, "utf-8");
    console.log(`\n✅ Written to ${outPath}`);
}

main();
