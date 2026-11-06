import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Specific realistic startup portfolios for prominent whales
SPECIFIC_STARTUPS = {
    '1': [ # Rekha Jhunjhunwala
        {
            "name": "Nazara Technologies",
            "category": "Gaming, Gamified Learning & Esports",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2017 (Series B)",
            "investedValue": "₹180 Cr",
            "currentValue": "₹1,710 Cr",
            "multiple": "9.5x",
            "status": "Listed on NSE (Multibagger)",
            "notes": "Rakesh & Rekha Jhunjhunwala held ~10% stake during massive listing pop.",
            "iconBg": "#10B981",
            "iconEmoji": "🎮"
        },
        {
            "name": "Akasa Air (SNV Aviation)",
            "category": "Commercial Aviation Airline",
            "stage": "Active (Growth Round)",
            "entryYear": "2021 (Founding Round)",
            "investedValue": "₹247 Cr",
            "currentValue": "₹1,250 Cr",
            "multiple": "5.1x",
            "status": "Fleet of 26 Boeing 737 MAX",
            "notes": "Rare Enterprises co-founded airline with veteran Vinay Dube.",
            "iconBg": "#F59E0B",
            "iconEmoji": "✈️"
        },
        {
            "name": "Concord Biotech",
            "category": "Biopharma & Fermentation APIs",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2004 (Early Growth PE)",
            "investedValue": "₹50 Cr",
            "currentValue": "₹610 Cr",
            "multiple": "12.2x",
            "status": "Listed on BSE/NSE",
            "notes": "Rare held ~24% stake at IPO; world leader in immunosuppressants.",
            "iconBg": "#6366F1",
            "iconEmoji": "💊"
        },
        {
            "name": "Metro Brands",
            "category": "Footwear & Premium Retail",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2007 (Pre-IPO Growth)",
            "investedValue": "₹120 Cr",
            "currentValue": "₹1,440 Cr",
            "multiple": "12.0x",
            "status": "Listed on NSE",
            "notes": "Initial private backing of Rafique Malik; now ₹3,015 Cr public holding.",
            "iconBg": "#EC4899",
            "iconEmoji": "👟"
        }
    ],
    '2': [ # Vijay Kedia
        {
            "name": "TAC Security (TAC Infosec)",
            "category": "Cybersecurity Risk & Vulnerability SaaS",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2016 (Angel Round)",
            "investedValue": "₹4.5 Cr",
            "currentValue": "₹128 Cr",
            "multiple": "28.4x",
            "status": "NSE Emerge Listing Record",
            "notes": "Trishneet Arora backed in angel stage; 173x oversubscribed IPO.",
            "iconBg": "#3B82F6",
            "iconEmoji": "🛡️"
        },
        {
            "name": "Affordable Robotic & Automation (ARAPL)",
            "category": "Warehouse Robotics & Car Parking Automation",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2018 (Pre-IPO Seed)",
            "investedValue": "₹12 Cr",
            "currentValue": "₹170 Cr",
            "multiple": "14.2x",
            "status": "BSE SME to Mainboard",
            "notes": "Early conviction in industrial automation robotics.",
            "iconBg": "#10B981",
            "iconEmoji": "🤖"
        },
        {
            "name": "Innovators Façade Systems",
            "category": "High-Rise Façade Engineering Tech",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2018 (Pre-IPO Round)",
            "investedValue": "₹15 Cr",
            "currentValue": "₹81 Cr",
            "multiple": "5.4x",
            "status": "NSE Listed",
            "notes": "Turnaround play in specialized building infrastructure.",
            "iconBg": "#F59E0B",
            "iconEmoji": "🏢"
        },
        {
            "name": "TechMatrix Solutions",
            "category": "Smart Industrial IoT & Sensors",
            "stage": "Active (Series A)",
            "entryYear": "2023 (Angel Round)",
            "investedValue": "₹8.0 Cr",
            "currentValue": "₹24.8 Cr",
            "multiple": "3.1x",
            "status": "Growing 120% YoY",
            "notes": "Seed backing for predictive maintenance hardware-software.",
            "iconBg": "#8B5CF6",
            "iconEmoji": "⚡"
        }
    ],
    '3': [ # Ashish Kacholia
        {
            "name": "Durlax Top Surface",
            "category": "Solid Acrylic Surfaces & Building Tech",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2023 (Pre-IPO Anchor)",
            "investedValue": "₹9.2 Cr",
            "currentValue": "₹62.5 Cr",
            "multiple": "6.8x",
            "status": "NSE Emerge Listing",
            "notes": "Pre-IPO equity block taken ahead of massive SME debut.",
            "iconBg": "#10B981",
            "iconEmoji": "🏗️"
        },
        {
            "name": "Aeroflex Industries",
            "category": "Metallic Flexible Hose Tech",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2023 (Pre-IPO Round)",
            "investedValue": "₹30 Cr",
            "currentValue": "₹135 Cr",
            "multiple": "4.5x",
            "status": "Mainboard Listed",
            "notes": "Strategic pre-IPO entry alongside anchor institutional book.",
            "iconBg": "#3B82F6",
            "iconEmoji": "🔧"
        },
        {
            "name": "Megatherm Induction",
            "category": "Induction Melting & Heavy Foundry Tech",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2023 (Pre-IPO Placement)",
            "investedValue": "₹12 Cr",
            "currentValue": "₹62 Cr",
            "multiple": "5.2x",
            "status": "NSE Emerge",
            "notes": "Industrial machinery supplier with steel plant tailwinds.",
            "iconBg": "#F59E0B",
            "iconEmoji": "⚙️"
        },
        {
            "name": "Repro India (e-Books)",
            "category": "Print-on-Demand & Digital Publishing",
            "stage": "Active (Growth Round)",
            "entryYear": "2021 (Strategic Equity)",
            "investedValue": "₹28 Cr",
            "currentValue": "₹106 Cr",
            "multiple": "3.8x",
            "status": "Operating & Cashflow Positive",
            "notes": "Backing tech platform integrated with Amazon Kindle & Flipkart.",
            "iconBg": "#8B5CF6",
            "iconEmoji": "📚"
        }
    ],
    '4': [ # Warren Buffett
        {
            "name": "BYD Company",
            "category": "Electric Vehicles & Battery Tech",
            "stage": "Exited via OTC / Public 🏆",
            "entryYear": "2008 (Private Placement)",
            "investedValue": "$232 Million",
            "currentValue": "$8.12 Billion",
            "multiple": "35.0x",
            "status": "Global EV Market Leader",
            "notes": "Charlie Munger urged Warren to buy 10% when Wang Chuanfu had a small battery firm.",
            "iconBg": "#10B981",
            "iconEmoji": "🚗"
        },
        {
            "name": "Nu Holdings (Nubank)",
            "category": "Digital Neo-Banking Unicorn",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2021 (Series G Pre-IPO)",
            "investedValue": "$500 Million",
            "currentValue": "$1.90 Billion",
            "multiple": "3.8x",
            "status": "NYSE Listed (100M+ customers)",
            "notes": "Berkshire's biggest venture-stage digital banking investment.",
            "iconBg": "#8B5CF6",
            "iconEmoji": "💳"
        },
        {
            "name": "StoneCo",
            "category": "Fintech & POS Merchant Acquiring",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2018 (Pre-IPO Private Placement)",
            "investedValue": "$340 Million",
            "currentValue": "$714 Million",
            "multiple": "2.1x",
            "status": "NASDAQ Listed",
            "notes": "Latin America merchant digitisation bet.",
            "iconBg": "#3B82F6",
            "iconEmoji": "🏪"
        },
        {
            "name": "Pilot Flying J",
            "category": "Travel Centers & Fleet Fuel Network",
            "stage": "Private Acquisition (100% Owned)",
            "entryYear": "2017 (Private Equity Buyout)",
            "investedValue": "$2.8 Billion",
            "currentValue": "$11.2 Billion",
            "multiple": "4.0x",
            "status": "Core Cash Flow Engine",
            "notes": "Largest travel center operator in North America with 750+ locations.",
            "iconBg": "#F59E0B",
            "iconEmoji": "⛽"
        }
    ],
    '5': [ # Radhakishan Damani
        {
            "name": "Avenue Supermarts (DMart)",
            "category": "Modern Discount Retail Chain",
            "stage": "Founder Equity (Listed) 🏆",
            "entryYear": "2002 (Founding Venture)",
            "investedValue": "₹150 Cr",
            "currentValue": "₹2,45,000 Cr",
            "multiple": "1630x",
            "status": "Mega Nifty 50 Titan",
            "notes": "One of India's greatest wealth creation stories in retail history.",
            "iconBg": "#10B981",
            "iconEmoji": "🛒"
        },
        {
            "name": "Apis India",
            "category": "Pure Honey & Food FMCG",
            "stage": "Active (Strategic Stake)",
            "entryYear": "2015 (Strategic Private Equity)",
            "investedValue": "₹18 Cr",
            "currentValue": "₹75.6 Cr",
            "multiple": "4.2x",
            "status": "Growing Export FMCG",
            "notes": "Value retail synergy with DMart private label supply chain.",
            "iconBg": "#F59E0B",
            "iconEmoji": "🍯"
        },
        {
            "name": "Dunzo",
            "category": "Hyperlocal Quick Delivery",
            "stage": "Angel Stage",
            "entryYear": "2017 (Angel Round)",
            "investedValue": "₹8.0 Cr",
            "currentValue": "₹20.0 Cr",
            "multiple": "2.5x",
            "status": "Strategic Reorganization",
            "notes": "Early Mumbai pilot backer before Reliance retail integration.",
            "iconBg": "#3B82F6",
            "iconEmoji": "🛵"
        },
        {
            "name": "Bikaji Foods",
            "category": "Ethnic Snacks & Bhujia D2C",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2020 (Pre-IPO Round)",
            "investedValue": "₹45 Cr",
            "currentValue": "₹153 Cr",
            "multiple": "3.4x",
            "status": "Listed on NSE",
            "notes": "Anchor backing alongside Shivratan Agarwal family.",
            "iconBg": "#EC4899",
            "iconEmoji": "🥨"
        }
    ],
    '13': [ # Premji and Associates (PremjiInvest)
        {
            "name": "Lenskart",
            "category": "Omnichannel Eyewear D2C Unicorn",
            "stage": "Active (Pre-IPO / Series D)",
            "entryYear": "2016 (Lead Series C)",
            "investedValue": "₹280 Cr",
            "currentValue": "₹2,630 Cr",
            "multiple": "9.4x",
            "status": "Valued at $5.6 Billion (IPO in 2026)",
            "notes": "PremjiInvest is one of Peyush Bansal's largest long-term institutional backers.",
            "iconBg": "#10B981",
            "iconEmoji": "👓"
        },
        {
            "name": "FirstCry (Brainbees Solutions)",
            "category": "Kids & Babycare Omnichannel Platform",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2015 (Series E & Pre-IPO)",
            "investedValue": "₹350 Cr",
            "currentValue": "₹2,275 Cr",
            "multiple": "6.5x",
            "status": "Listed on NSE/BSE",
            "notes": "Massive IPO debut with marquee multi-bagger return.",
            "iconBg": "#3B82F6",
            "iconEmoji": "👶"
        },
        {
            "name": "PolicyBazaar (PB Fintech)",
            "category": "Online Insurance & Lending Marketplace",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2015 (Growth Round)",
            "investedValue": "₹160 Cr",
            "currentValue": "₹1,152 Cr",
            "multiple": "7.2x",
            "status": "Listed on NSE",
            "notes": "Early conviction in digital insurance distribution.",
            "iconBg": "#6366F1",
            "iconEmoji": "☂️"
        },
        {
            "name": "Udaan",
            "category": "B2B E-Commerce Marketplace",
            "stage": "Active (Series D)",
            "entryYear": "2019 (Series D Lead)",
            "investedValue": "₹210 Cr",
            "currentValue": "₹462 Cr",
            "multiple": "2.2x",
            "status": "Valued at $1.8 Billion",
            "notes": "Digitizing trade between small kiranas and manufacturers.",
            "iconBg": "#F59E0B",
            "iconEmoji": "📦"
        },
        {
            "name": "Shubham Housing Finance",
            "category": "Affordable Housing Micro-Fintech",
            "stage": "Active (Series C)",
            "entryYear": "2017 (Series C Lead)",
            "investedValue": "₹120 Cr",
            "currentValue": "₹492 Cr",
            "multiple": "4.1x",
            "status": "Preparing for IPO",
            "notes": "Lending to informal income home buyers with clean NPA profile.",
            "iconBg": "#EC4899",
            "iconEmoji": "🏡"
        }
    ],
    '19': [ # Sanjeev Bikchandani (Info Edge)
        {
            "name": "Zomato",
            "category": "Food Delivery, Dining & Blinkit Quick Commerce",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2010 (Seed & Series A)",
            "investedValue": "₹4.7 Cr",
            "currentValue": "₹14,200 Cr",
            "multiple": "3021x",
            "status": "Nifty 50 Index Titan",
            "notes": "India's greatest venture bet: ₹4.7 Cr angel cheque yielded ₹14,000+ Cr!",
            "iconBg": "#10B981",
            "iconEmoji": "🍕"
        },
        {
            "name": "PolicyBazaar",
            "category": "Digital Insurance & Financial Supermarket",
            "stage": "Exited via IPO 🏆",
            "entryYear": "2008 (Series A 1st Backer)",
            "investedValue": "₹32 Cr",
            "currentValue": "₹1,440 Cr",
            "multiple": "45.0x",
            "status": "Listed on NSE",
            "notes": "First institutional cheque written to Yashish Dahiya.",
            "iconBg": "#3B82F6",
            "iconEmoji": "🛡️"
        },
        {
            "name": "Gramophone",
            "category": "Full-Stack Agritech & Farmer Inputs",
            "stage": "Active (Series B)",
            "entryYear": "2018 (Series A Lead)",
            "investedValue": "₹25 Cr",
            "currentValue": "₹70 Cr",
            "multiple": "2.8x",
            "status": "Active & Expanding",
            "notes": "Empowering 2 Million farmers with digital agritech advisory.",
            "iconBg": "#F59E0B",
            "iconEmoji": "🌾"
        },
        {
            "name": "Ustraa (Happily Unmarried)",
            "category": "Men's D2C Grooming & Personal Care",
            "stage": "Active (Series B)",
            "entryYear": "2012 (Angel/Series A)",
            "investedValue": "₹15 Cr",
            "currentValue": "₹46.5 Cr",
            "multiple": "3.1x",
            "status": "Omnichannel Retail",
            "notes": "Early pioneer of homegrown men's grooming brands in India.",
            "iconBg": "#8B5CF6",
            "iconEmoji": "💈"
        }
    ],
    '41': [ # Ken Griffin (Citadel)
        {
            "name": "SpaceX",
            "category": "Commercial Aerospace & Starlink Broadband",
            "stage": "Active (Series N)",
            "entryYear": "2019 (Private Secondary)",
            "investedValue": "$120 Million",
            "currentValue": "$648 Million",
            "multiple": "5.4x",
            "status": "Valued at $210 Billion",
            "notes": "Strategic placement in private rocket reusable tech and satellite orbital internet.",
            "iconBg": "#10B981",
            "iconEmoji": "🚀"
        },
        {
            "name": "Stripe",
            "category": "Global Online Payments Infrastructure",
            "stage": "Active (Secondary Tender)",
            "entryYear": "2020 (Series H)",
            "investedValue": "$85 Million",
            "currentValue": "$272 Million",
            "multiple": "3.2x",
            "status": "Valued at $70 Billion",
            "notes": "Backing Patrick & John Collison's financial rails for the internet.",
            "iconBg": "#3B82F6",
            "iconEmoji": "💳"
        },
        {
            "name": "Databricks",
            "category": "Enterprise Data Intelligence & AI Lakehouse",
            "stage": "Active (Series I)",
            "entryYear": "2021 (Series H/I)",
            "investedValue": "$60 Million",
            "currentValue": "$246 Million",
            "multiple": "4.1x",
            "status": "Valued at $43 Billion",
            "notes": "AI-era analytics foundation used by 60%+ of Fortune 500.",
            "iconBg": "#8B5CF6",
            "iconEmoji": "📊"
        }
    ],
    '43': [ # Chase Coleman (Tiger Global)
        {
            "name": "Flipkart",
            "category": "Indian E-Commerce Giant",
            "stage": "Exited to Walmart 🏆",
            "entryYear": "2009 (Series B Lead)",
            "investedValue": "$1.2 Billion total",
            "currentValue": "$3.3 Billion payout",
            "multiple": "25.0x early basis",
            "status": "Historic $16B Acquisition",
            "notes": "Lee Fixel & Chase Coleman identified Sachin & Binny Bansal in early days.",
            "iconBg": "#10B981",
            "iconEmoji": "🛍️"
        },
        {
            "name": "ByteDance (TikTok)",
            "category": "GenAI & Short-Form Video Platform",
            "stage": "Active (Growth Round)",
            "entryYear": "2018 (Series C Lead)",
            "investedValue": "$450 Million",
            "currentValue": "$8.32 Billion",
            "multiple": "18.5x",
            "status": "Valued at $220 Billion",
            "notes": "One of the most profitable venture bets in modern software history.",
            "iconBg": "#EC4899",
            "iconEmoji": "📱"
        },
        {
            "name": "OpenAI",
            "category": "Frontier Artificial Intelligence (ChatGPT)",
            "stage": "Active (Tender Offer / Growth)",
            "entryYear": "2021 (Growth Round)",
            "investedValue": "$200 Million",
            "currentValue": "$1.24 Billion",
            "multiple": "6.2x",
            "status": "Valued at $157 Billion",
            "notes": "Leading investor in Sam Altman's frontier foundation model scale.",
            "iconBg": "#3B82F6",
            "iconEmoji": "🧠"
        },
        {
            "name": "Stripe",
            "category": "Developer-First Payment Processing",
            "stage": "Active (Series C/D)",
            "entryYear": "2014 (Series C)",
            "investedValue": "$150 Million",
            "currentValue": "$1.80 Billion",
            "multiple": "12.0x",
            "status": "Valued at $70 Billion",
            "notes": "Continuous participation in developer-friendly fintech scaling.",
            "iconBg": "#F59E0B",
            "iconEmoji": "💳"
        }
    ]
}

def generate_startups_for_whale(whale_id, name, tag):
    if whale_id in SPECIFIC_STARTUPS:
        return SPECIFIC_STARTUPS[whale_id]

    is_global = any(g in tag for g in ['US', 'Global', 'Hedge Fund', 'Macro', 'Value', 'Fundsmith'])
    if is_global:
        return [
            {
                "name": "SpaceX Starlink",
                "category": "Space Exploration & Satellite Telecom",
                "stage": "Active (Series N)",
                "entryYear": "2020 (Growth Round)",
                "investedValue": "$40 Million",
                "currentValue": "$168 Million",
                "multiple": "4.2x",
                "status": "Global Launch Dominance",
                "notes": "Private placement in reusable orbital launch infrastructure.",
                "iconBg": "#10B981",
                "iconEmoji": "🚀"
            },
            {
                "name": "Anthropic AI",
                "category": "Claude LLM & AI Safety Frontier",
                "stage": "Active (Series C)",
                "entryYear": "2023 (Series C)",
                "investedValue": "$25 Million",
                "currentValue": "$125 Million",
                "multiple": "5.0x",
                "status": "Valued at $40 Billion",
                "notes": "Frontier enterprise GenAI reasoning foundation models.",
                "iconBg": "#6366F1",
                "iconEmoji": "🤖"
            },
            {
                "name": "Anduril Industries",
                "category": "Autonomous Defence & Drone Systems",
                "stage": "Active (Series E)",
                "entryYear": "2022 (Series E)",
                "investedValue": "$20 Million",
                "currentValue": "$76 Million",
                "multiple": "3.8x",
                "status": "Valued at $14 Billion",
                "notes": "Next-gen autonomous software-defined defence hardware.",
                "iconBg": "#F59E0B",
                "iconEmoji": "🛡️"
            }
        ]
    else:
        first_name = name.split()[0]
        return [
            {
                "name": f"{first_name} BioTech Innovations",
                "category": "Specialty APIs & Fermentation Chemistry",
                "stage": "Pre-IPO Stage 🚀",
                "entryYear": "2022 (Pre-IPO Placement)",
                "investedValue": "₹18 Cr",
                "currentValue": "₹75.6 Cr",
                "multiple": "4.2x",
                "status": "Filed DRHP with SEBI",
                "notes": "Export-focused specialty formulations with 28% EBITDA margin.",
                "iconBg": "#10B981",
                "iconEmoji": "🔬"
            },
            {
                "name": "AeroTech Dynamics",
                "category": "Drone Avionics & Precision Machining",
                "stage": "Exited via IPO 🏆",
                "entryYear": "2021 (Angel Seed)",
                "investedValue": "₹8.5 Cr",
                "currentValue": "₹59.5 Cr",
                "multiple": "7.0x",
                "status": "NSE Emerge Listing",
                "notes": "Indigenisation defence supplier under Make in India mandate.",
                "iconBg": "#3B82F6",
                "iconEmoji": "🚁"
            },
            {
                "name": "VoltPulse Clean Energy",
                "category": "EV Fleet Fast-Charging Tech",
                "stage": "Active (Series A)",
                "entryYear": "2023 (Series A Lead)",
                "investedValue": "₹12 Cr",
                "currentValue": "₹37.2 Cr",
                "multiple": "3.1x",
                "status": "Operating in 14 Metros",
                "notes": "B2B fleet charging network partnered with quick-commerce platforms.",
                "iconBg": "#F59E0B",
                "iconEmoji": "⚡"
            }
        ]

SAMPLE_STOCKS_EXPANSION = [
    {"name": "Tata Motors", "symbol": "TATAMOTORS", "sector": "Automobile & EV", "cmp": "₹895", "change1Y": "+54.2%"},
    {"name": "Crisil Ltd", "symbol": "CRISIL", "sector": "Rating & Research", "cmp": "₹4,950", "change1Y": "+21.4%"},
    {"name": "Fortis Healthcare", "symbol": "FORTIS", "sector": "Healthcare & Hospitals", "cmp": "₹495", "change1Y": "+41.8%"},
    {"name": "Federal Bank", "symbol": "FEDERALBNK", "sector": "Private Banking", "cmp": "₹198", "change1Y": "+31.2%"},
    {"name": "Canara Bank", "symbol": "CANBK", "sector": "Public Banking", "cmp": "₹102", "change1Y": "+46.5%"},
    {"name": "Vaibhav Global", "symbol": "VAIBHAVGBL", "sector": "E-Commerce Retail", "cmp": "₹315", "change1Y": "-6.8%"},
    {"name": "Agro Tech Foods", "symbol": "ATFL", "sector": "Packaged Foods FMCG", "cmp": "₹780", "change1Y": "+14.3%"},
    {"name": "Karur Vysya Bank", "symbol": "KARURVYSYA", "sector": "Regional Banking", "cmp": "₹215", "change1Y": "+62.0%"},
    {"name": "Dishman Carbogen", "symbol": "DCAL", "sector": "Pharma CDMO", "cmp": "₹165", "change1Y": "+18.2%"},
    {"name": "Jubilant Ingrevia", "symbol": "JUBLINGREA", "sector": "Specialty Chemicals", "cmp": "₹590", "change1Y": "+25.6%"},
]

print("Reading mockWhales.js...")
with open('src/data/mockWhales.js', 'r', encoding='utf-8') as f:
    text = f.read()

raw_blocks = text.split("\n  {\n    id:")[1:]
print(f"Extracted {len(raw_blocks)} whale blocks.")

output_whales = []

for raw in raw_blocks:
    block = "    id:" + raw
    id_m = re.search(r'id:\s*[\'"](\d+)[\'"]', block)
    name_m = re.search(r'name:\s*[\'"]([^\'"]+)[\'"]', block)
    tag_m = re.search(r'tag:\s*[\'"]([^\'"]+)[\'"]', block)
    pv_m = re.search(r'portfolioValue:\s*[\'"]([^\'"]+)[\'"]', block)
    r1y_m = re.search(r'return1Y:\s*[\'"]([^\'"]+)[\'"]', block)
    pos_m = re.search(r'isPositive:\s*(true|false)', block)
    av_m = re.search(r'avatar:\s*[\'"]([^\'"]+)[\'"]', block)

    if not (id_m and name_m):
        continue

    w_id = id_m.group(1)
    w_name = name_m.group(1)
    w_tag = tag_m.group(1) if tag_m else "🇮🇳 Super Investor"
    w_pv = pv_m.group(1) if pv_m else "₹1,000 Cr"
    w_r1y = r1y_m.group(1) if r1y_m else "+15.0%"
    w_pos = (pos_m.group(1) == 'true') if pos_m else True
    w_av = av_m.group(1) if av_m else w_name[:2].upper()

    # extract topHoldings
    th_match = re.search(r'topHoldings:\s*\[(.*?)\]', block, re.DOTALL)
    top_holdings = []
    if th_match:
        th_content = th_match.group(1)
        th_items = re.findall(r'\{\s*name:\s*[\'"]([^\'"]+)[\'"],\s*stake:\s*[\'"]([^\'"]+)[\'"],\s*value:\s*[\'"]([^\'"]+)[\'"]\s*\}', th_content)
        for name, stake, val in th_items:
            top_holdings.append({"name": name, "stake": stake, "value": val})

    # extract recentMoves
    rm_match = re.search(r'recentMoves:\s*\[(.*?)\]', block, re.DOTALL)
    recent_moves = []
    if rm_match:
        rm_content = rm_match.group(1)
        rm_items = re.findall(r'\{\s*type:\s*[\'"]([^\'"]+)[\'"],\s*stock:\s*[\'"]([^\'"]+)[\'"],\s*detail:\s*[\'"]([^\'"]+)[\'"],\s*date:\s*[\'"]([^\'"]+)[\'"]\s*\}', rm_content)
        for m_type, m_stock, m_detail, m_date in rm_items:
            recent_moves.append({"type": m_type, "stock": m_stock, "detail": m_detail, "date": m_date})

    # Generate allHoldings
    all_holdings = []
    weights = [32.0, 18.5, 12.4, 9.1, 6.5, 5.2, 4.4, 3.8, 3.1, 2.5, 1.5]

    for idx, th in enumerate(top_holdings):
        symbol = th['name'].upper().replace(' ', '').replace('LTD', '').replace('.', '')[:8]
        sector = "Capital Goods & Infra" if idx % 3 == 0 else ("Consumer Discretionary" if idx % 3 == 1 else "Banking & Finance")
        if "Titan" in th['name']: sector = "Jewellery & Watches"
        elif "Health" in th['name']: sector = "Health Insurance"
        elif "NCC" in th['name']: sector = "Construction & Infra"
        elif "Metro" in th['name']: sector = "Footwear Retail"
        elif "Tejas" in th['name']: sector = "Telecom Networking"
        elif "Sudarshan" in th['name']: sector = "Pigments & Chemicals"
        elif "Elecon" in th['name']: sector = "Transmission Gears"
        elif "Apple" in th['name']: sector = "Consumer Electronics"
        elif "Bank of America" in th['name']: sector = "Global Investment Banking"
        elif "American Express" in th['name']: sector = "Credit Cards & Payments"
        elif "Coca-Cola" in th['name']: sector = "Beverages & FMCG"
        elif "DMart" in th['name']: sector = "Supermarket Retail"
        elif "Gravita" in th['name']: sector = "Lead & Metal Recycling"
        elif "Microsoft" in th['name']: sector = "Enterprise Cloud & AI"
        elif "Novo Nordisk" in th['name']: sector = "Obesity & Diabetes Pharma"
        elif "L’Oréal" in th['name'] or "L'Oreal" in th['name']: sector = "Beauty & Cosmetics"
        elif "Stryker" in th['name']: sector = "Medical Tech & Implants"

        all_holdings.append({
            "name": th['name'],
            "symbol": symbol,
            "sector": sector,
            "stake": th['stake'],
            "value": th['value'],
            "cmp": f"₹{(idx + 1) * 780 + 340}",
            "change1Y": f"+{round(14.5 + idx * 7.2, 1)}%",
            "weightPercent": weights[idx] if idx < len(weights) else 3.0
        })

    for exp_idx, exp in enumerate(SAMPLE_STOCKS_EXPANSION[:7]):
        if any(h['name'].lower() == exp['name'].lower() for h in all_holdings):
            continue
        curr_weight_idx = len(all_holdings)
        wt = weights[curr_weight_idx] if curr_weight_idx < len(weights) else 1.8
        
        pv_clean = w_pv.replace('₹', '').replace(' Cr', '').replace(',', '').strip()
        try:
            pv_num = float(pv_clean)
            val_str = f"₹{round(pv_num * (wt / 100)):,} Cr"
        except:
            val_str = "£120M" if "£" in w_pv else "$140M"

        all_holdings.append({
            "name": exp['name'],
            "symbol": exp['symbol'],
            "sector": exp['sector'],
            "stake": f"{round(1.1 + (exp_idx * 0.3), 1)}%",
            "value": val_str,
            "cmp": exp['cmp'],
            "change1Y": exp['change1Y'],
            "weightPercent": wt
        })

    startups = generate_startups_for_whale(w_id, w_name, w_tag)

    output_whales.append({
        "id": w_id,
        "name": w_name,
        "tag": w_tag,
        "portfolioValue": w_pv,
        "return1Y": w_r1y,
        "isPositive": w_pos,
        "avatar": w_av,
        "topHoldings": top_holdings,
        "allHoldings": all_holdings,
        "startups": startups,
        "recentMoves": recent_moves
    })

print(f"Processed {len(output_whales)} whales successfully.")

# Write back to mockWhales.js
with open('src/data/mockWhales.js', 'w', encoding='utf-8') as f:
    f.write("export const mockWhales = [\n")
    for w in output_whales:
        f.write("  {\n")
        f.write(f"    id: '{w['id']}',\n")
        f.write(f"    name: {json.dumps(w['name'], ensure_ascii=False)},\n")
        f.write(f"    tag: {json.dumps(w['tag'], ensure_ascii=False)},\n")
        f.write(f"    portfolioValue: {json.dumps(w['portfolioValue'], ensure_ascii=False)},\n")
        f.write(f"    return1Y: {json.dumps(w['return1Y'], ensure_ascii=False)},\n")
        f.write(f"    isPositive: {'true' if w['isPositive'] else 'false'},\n")
        f.write(f"    avatar: {json.dumps(w['avatar'], ensure_ascii=False)},\n")
        f.write(f"    localImage: require('../../assets/whales/whale_{w['id']}.jpg'),\n")

        # topHoldings
        f.write("    topHoldings: [\n")
        for th in w['topHoldings']:
            f.write(f"      {{ name: {json.dumps(th['name'], ensure_ascii=False)}, stake: {json.dumps(th['stake'], ensure_ascii=False)}, value: {json.dumps(th['value'], ensure_ascii=False)} }},\n")
        f.write("    ],\n")

        # allHoldings
        f.write("    allHoldings: [\n")
        for ah in w['allHoldings']:
            f.write("      {\n")
            f.write(f"        name: {json.dumps(ah['name'], ensure_ascii=False)},\n")
            f.write(f"        symbol: {json.dumps(ah['symbol'], ensure_ascii=False)},\n")
            f.write(f"        sector: {json.dumps(ah['sector'], ensure_ascii=False)},\n")
            f.write(f"        stake: {json.dumps(ah['stake'], ensure_ascii=False)},\n")
            f.write(f"        value: {json.dumps(ah['value'], ensure_ascii=False)},\n")
            f.write(f"        cmp: {json.dumps(ah['cmp'], ensure_ascii=False)},\n")
            f.write(f"        change1Y: {json.dumps(ah['change1Y'], ensure_ascii=False)},\n")
            f.write(f"        weightPercent: {ah['weightPercent']},\n")
            f.write("      },\n")
        f.write("    ],\n")

        # startups
        f.write("    startups: [\n")
        for st in w['startups']:
            f.write("      {\n")
            f.write(f"        name: {json.dumps(st['name'], ensure_ascii=False)},\n")
            f.write(f"        category: {json.dumps(st['category'], ensure_ascii=False)},\n")
            f.write(f"        stage: {json.dumps(st['stage'], ensure_ascii=False)},\n")
            f.write(f"        entryYear: {json.dumps(st['entryYear'], ensure_ascii=False)},\n")
            f.write(f"        investedValue: {json.dumps(st['investedValue'], ensure_ascii=False)},\n")
            f.write(f"        currentValue: {json.dumps(st['currentValue'], ensure_ascii=False)},\n")
            f.write(f"        multiple: {json.dumps(st['multiple'], ensure_ascii=False)},\n")
            f.write(f"        status: {json.dumps(st['status'], ensure_ascii=False)},\n")
            f.write(f"        notes: {json.dumps(st['notes'], ensure_ascii=False)},\n")
            f.write(f"        iconBg: {json.dumps(st['iconBg'], ensure_ascii=False)},\n")
            f.write(f"        iconEmoji: {json.dumps(st['iconEmoji'], ensure_ascii=False)},\n")
            f.write("      },\n")
        f.write("    ],\n")

        # recentMoves
        f.write("    recentMoves: [\n")
        for rm in w['recentMoves']:
            f.write(f"      {{ type: {json.dumps(rm['type'], ensure_ascii=False)}, stock: {json.dumps(rm['stock'], ensure_ascii=False)}, detail: {json.dumps(rm['detail'], ensure_ascii=False)}, date: {json.dumps(rm['date'], ensure_ascii=False)} }},\n")
        f.write("    ],\n")

        f.write("  },\n")
    f.write("];\n")

print("mockWhales.js successfully rewritten with allHoldings and startups for ALL 50 whales!")
