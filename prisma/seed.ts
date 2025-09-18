import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  PropertyStatus,
  PropertyType,
  WorkflowState,
  Role
} from '@prisma/client';

config();

const prisma = new PrismaClient();

type LocaleContent = {
  en: string;
  th: string;
  zh: string;
};

type PropertySeed = {
  slug: string;
  status: PropertyStatus;
  type: PropertyType;
  price: number;
  area?: number;
  beds?: number;
  baths?: number;
  deposit?: boolean;
  reservedUntil?: Date;
  publishedAt?: Date;
  location: {
    province: string;
    district?: string;
    subdistrict?: string;
    lat?: number;
    lng?: number;
  };
  images: string[];
  title: LocaleContent;
  description: LocaleContent;
  amenities: Record<string, boolean>;
};

const propertySeeds: PropertySeed[] = [
  {
    slug: 'bangkok-river-condo',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.CONDO,
    price: 7800000,
    area: 82,
    beds: 2,
    baths: 2,
    deposit: true,
    location: {
      province: 'Bangkok',
      district: 'Bang Rak',
      subdistrict: 'Si Lom',
      lat: 13.7236,
      lng: 100.5286
    },
    images: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
      'https://images.unsplash.com/photo-1501183638710-841dd1904471',
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb'
    ],
    title: {
      en: 'Bangkok Riverfront Condo',
      th: 'คอนโดริมเจ้าพระยา กรุงเทพฯ',
      zh: '曼谷河畔公寓'
    },
    description: {
      en: 'Corner two-bedroom unit with sweeping river views and direct BTS access in Bang Rak.',
      th: 'ห้องมุมสองห้องนอนวิวแม่น้ำกว้าง พร้อมทางเชื่อม BTS โดยตรงในเขตบางรัก.',
      zh: '两居室转角单位，享有昭披耶河全景，并可直接连通轻轨。'
    },
    amenities: {
      parking: true,
      pool: true,
      security: true,
      gym: true,
      concierge: true
    }
  },
  {
    slug: 'chiangmai-mountain-villa',
    status: PropertyStatus.SOLD,
    type: PropertyType.HOUSE,
    price: 12500000,
    area: 320,
    beds: 4,
    baths: 4,
    deposit: false,
    location: {
      province: 'Chiang Mai',
      district: 'Hang Dong',
      subdistrict: 'Ban Waen',
      lat: 18.7061,
      lng: 98.9409
    },
    images: [
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994',
      'https://images.unsplash.com/photo-1531835551805-16d864c8d411'
    ],
    title: {
      en: 'Chiang Mai Mountain Villa',
      th: 'วิลล่ามุมเขา เชียงใหม่',
      zh: '清迈山景别墅'
    },
    description: {
      en: 'Gated residence nestled against Doi Suthep with private saltwater pool and tropical gardens.',
      th: 'บ้านพักในโครงการพร้อมระบบรักษาความปลอดภัย ติดดอยสุเทพพร้อมสระน้ำเกลือและสวนเขตร้อน.',
      zh: '位于素帖山麓的保安社区，配备私家盐水泳池及热带花园。'
    },
    amenities: {
      parking: true,
      pool: true,
      security: true,
      garden: true,
      smartHome: true
    }
  },
  {
    slug: 'phuket-marina-condo',
    status: PropertyStatus.RESERVED,
    type: PropertyType.CONDO,
    price: 9400000,
    area: 105,
    beds: 3,
    baths: 3,
    deposit: true,
    reservedUntil: new Date('2024-09-15'),
    location: {
      province: 'Phuket',
      district: 'Thalang',
      subdistrict: 'Si Sunthon',
      lat: 8.0243,
      lng: 98.3381
    },
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?ixid=1',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'
    ],
    title: {
      en: 'Phuket Marina Residence',
      th: 'เรสซิเดนซ์ริมมารีน่า ภูเก็ต',
      zh: '普吉码头公寓'
    },
    description: {
      en: 'Fully furnished marina-facing condominium with private berth access and sunset terrace.',
      th: 'คอนโดพร้อมเฟอร์นิเจอร์ครบ วิวมารีน่า พร้อมทางลงเรือส่วนตัวและเทอเรซชมพระอาทิตย์ตก.',
      zh: '精装修码头景观公寓，配有私人泊位通道与观景露台。'
    },
    amenities: {
      parking: true,
      pool: true,
      security: true,
      marina: true,
      rooftop: true
    }
  },
  {
    slug: 'chonburi-beachfront-land',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.LAND,
    price: 52000000,
    area: 9600,
    location: {
      province: 'Chon Buri',
      district: 'Bang Lamung',
      subdistrict: 'Na Kluea',
      lat: 12.9647,
      lng: 100.8901
    },
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
      'https://images.unsplash.com/photo-1493558103817-58b2924bce98',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee'
    ],
    title: {
      en: 'Chon Buri Beachfront Plot',
      th: 'ที่ดินติดทะเล ชลบุรี',
      zh: '春武里海滨土地'
    },
    description: {
      en: 'Prime 6-rai parcel on Wong Amat Beach ideal for resort or branded residence development.',
      th: 'ที่ดินติดหาดวงศ์อมาตย์ขนาด 6 ไร่ เหมาะสำหรับพัฒนารีสอร์ตหรือเรสซิเดนซ์แบรนด์ดัง.',
      zh: '位于旺阿玛海滩的黄金 6 莱土地，适合打造度假村或品牌公寓。'
    },
    amenities: {
      beachfront: true,
      roadAccess: true,
      utilities: true
    }
  },
  {
    slug: 'khonkaen-business-hub',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.COMMERCIAL,
    price: 36000000,
    area: 680,
    beds: 0,
    baths: 6,
    deposit: false,
    location: {
      province: 'Khon Kaen',
      district: 'Mueang Khon Kaen',
      subdistrict: 'Nai Mueang',
      lat: 16.4419,
      lng: 102.8355
    },
    images: [
      'https://images.unsplash.com/photo-1529429617124-aee0118aa0b9',
      'https://images.unsplash.com/photo-1460317442991-0ec209397118',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab'
    ],
    title: {
      en: 'Khon Kaen Business Hub',
      th: 'อาคารสำนักงานศูนย์ธุรกิจ ขอนแก่น',
      zh: '孔敬商务中心'
    },
    description: {
      en: 'Six-storey corner office with showroom frontage on Mittraphap Road near Central Plaza.',
      th: 'อาคารสำนักงานหัวมุม 6 ชั้น มีพื้นที่โชว์รูมติดถนนมิตรภาพใกล้เซ็นทรัลพลาซ่า.',
      zh: '六层转角写字楼，Mittraphap 路临街展示面，近中央广场。'
    },
    amenities: {
      parking: true,
      elevator: true,
      backupPower: true,
      meetingRooms: true
    }
  },
  {
    slug: 'bangkok-luxury-penthouse',
    status: PropertyStatus.SOLD,
    type: PropertyType.CONDO,
    price: 18500000,
    area: 210,
    beds: 3,
    baths: 4,
    deposit: false,
    location: {
      province: 'Bangkok',
      district: 'Pathum Wan',
      subdistrict: 'Lumphini',
      lat: 13.7327,
      lng: 100.5417
    },
    images: [
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=2',
      'https://images.unsplash.com/photo-1501183638710-841dd1904471?ixid=2',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixid=2'
    ],
    title: {
      en: 'Sukhumvit Luxury Penthouse',
      th: 'เพนท์เฮาส์หรู สุขุมวิท',
      zh: '素坤逸豪华顶层公寓'
    },
    description: {
      en: 'Dual-level penthouse with private plunge pool, sky lounge, and panoramic city skyline.',
      th: 'เพนท์เฮาส์สองชั้นพร้อมสระจากุซซี่ส่วนตัว เลาจ์บนฟ้า และวิวเมืองรอบด้าน.',
      zh: '双层顶层公寓，带私家浸泡池、空中酒廊及全景城市天际线。'
    },
    amenities: {
      parking: true,
      pool: true,
      security: true,
      skyLounge: true,
      concierge: true
    }
  },
  {
    slug: 'samutprakarn-industrial-warehouse',
    status: PropertyStatus.RESERVED,
    type: PropertyType.COMMERCIAL,
    price: 28000000,
    area: 1450,
    baths: 4,
    reservedUntil: new Date('2024-08-01'),
    location: {
      province: 'Samut Prakan',
      district: 'Bang Phli',
      subdistrict: 'Racha Thewa',
      lat: 13.6824,
      lng: 100.7487
    },
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b',
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e',
      'https://images.unsplash.com/photo-1503389152951-9f343605f61e'
    ],
    title: {
      en: 'Samut Prakan Logistics Warehouse',
      th: 'คลังโลจิสติกส์ สมุทรปราการ',
      zh: '北榄物流仓库'
    },
    description: {
      en: 'High-clearance warehouse near Suvarnabhumi Airport with loading docks and cold room option.',
      th: 'คลังสินค้าหลังคาสูง ใกล้สนามบินสุวรรณภูมิ พร้อมท่าขนถ่ายและห้องเย็น.',
      zh: '位于素万那普机场附近的高层仓库，带装卸码头及冷链选项。'
    },
    amenities: {
      loadingDocks: true,
      security: true,
      truckAccess: true,
      coldStorageReady: true
    }
  },
  {
    slug: 'chiangrai-eco-resort',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.HOUSE,
    price: 9200000,
    area: 280,
    beds: 5,
    baths: 5,
    deposit: true,
    location: {
      province: 'Chiang Rai',
      district: 'Mae Chan',
      subdistrict: 'Mae Kham',
      lat: 20.112,
      lng: 99.8522
    },
    images: [
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=3',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=4',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858'
    ],
    title: {
      en: 'Chiang Rai Eco Retreat',
      th: 'รีทรีตเชิงนิเวศ เชียงราย',
      zh: '清莱生态度假屋'
    },
    description: {
      en: 'Cluster of teak villas with herbal spa facilities overlooking rolling tea plantations.',
      th: 'กลุ่มวิลล่าไม้สักพร้อมสปาสมุนไพร มองเห็นไร่ชาเขียวขจี.',
      zh: '柚木别墅群，配备草本水疗，可俯瞰连绵茶园。'
    },
    amenities: {
      spa: true,
      garden: true,
      parking: true,
      solarPanels: true
    }
  },
  {
    slug: 'nan-riverside-land',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.LAND,
    price: 8500000,
    area: 7200,
    location: {
      province: 'Nan',
      district: 'Mueang Nan',
      subdistrict: 'Chai Sathan',
      lat: 18.7872,
      lng: 100.7799
    },
    images: [
      'https://images.unsplash.com/photo-1470246973918-29a93221c455',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixid=3',
      'https://images.unsplash.com/photo-1493558103817-58b2924bce98?ixid=3'
    ],
    title: {
      en: 'Nan Riverside Sanctuary Land',
      th: 'ที่ดินริมแม่น้ำน่าน',
      zh: '楠府河畔土地'
    },
    description: {
      en: 'Serene riverside plot surrounded by mountain vistas, suitable for boutique homestay project.',
      th: 'ที่ดินเงียบสงบติดแม่น้ำน่าน ล้อมด้วยวิวภูเขา เหมาะทำโฮมสเตย์บูทีค.',
      zh: '静谧河畔地块，群山环绕，适合打造精品民宿。'
    },
    amenities: {
      riverfront: true,
      utilities: true,
      farmland: true
    }
  },
  {
    slug: 'ayutthaya-heritage-house',
    status: PropertyStatus.RESERVED,
    type: PropertyType.HOUSE,
    price: 6900000,
    area: 190,
    beds: 3,
    baths: 3,
    reservedUntil: new Date('2024-07-10'),
    location: {
      province: 'Phra Nakhon Si Ayutthaya',
      district: 'Phra Nakhon Si Ayutthaya',
      subdistrict: 'Ho Rattanachai',
      lat: 14.3532,
      lng: 100.5683
    },
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=5'
    ],
    title: {
      en: 'Ayutthaya Heritage House',
      th: 'บ้านมรดกอยุธยา',
      zh: '大城遗产住宅'
    },
    description: {
      en: 'Renovated teak residence blending traditional Thai design with modern riverfront living.',
      th: 'บ้านไม้สักปรับปรุงใหม่ ผสานสถาปัตยกรรมไทยและการอยู่อาศัยริมแม่น้ำยุคใหม่.',
      zh: '翻新柚木宅邸，融合泰式传统与现代河畔生活。'
    },
    amenities: {
      parking: true,
      garden: true,
      security: true,
      riverDeck: true
    }
  },
  {
    slug: 'pattaya-sunset-condo',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.CONDO,
    price: 6200000,
    area: 74,
    beds: 2,
    baths: 2,
    deposit: true,
    location: {
      province: 'Chon Buri',
      district: 'Pattaya',
      subdistrict: 'Nong Prue',
      lat: 12.9236,
      lng: 100.8825
    },
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixid=5',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=6'
    ],
    title: {
      en: 'Pattaya Sunset Condo',
      th: 'คอนโดวิวพระอาทิตย์ตก พัทยา',
      zh: '芭提雅夕阳公寓'
    },
    description: {
      en: 'High-floor unit facing Pattaya Bay with resort-style facilities and co-working lounge.',
      th: 'ห้องชั้นสูงวิวอ่าวพัทยา พร้อมสิ่งอำนวยความสะดวกแบบรีสอร์ตและเลานจ์โคเวิร์กกิ้ง.',
      zh: '高层海景房，俯瞰芭提雅湾，配备度假式设施与共享办公区。'
    },
    amenities: {
      pool: true,
      gym: true,
      coworking: true,
      security: true
    }
  },
  {
    slug: 'korat-family-home',
    status: PropertyStatus.SOLD,
    type: PropertyType.HOUSE,
    price: 5400000,
    area: 220,
    beds: 4,
    baths: 3,
    deposit: false,
    location: {
      province: 'Nakhon Ratchasima',
      district: 'Mueang Nakhon Ratchasima',
      subdistrict: 'Nai Mueang',
      lat: 14.9799,
      lng: 102.0977
    },
    images: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixid=1',
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?ixid=1',
      'https://images.unsplash.com/photo-1560448075-bb4f51a686f2'
    ],
    title: {
      en: 'Korat Family Residence',
      th: 'บ้านเดี่ยวครอบครัว โคราช',
      zh: '呵叻家庭住宅'
    },
    description: {
      en: 'Modern family home near schools and The Mall Korat featuring double kitchen and play lawn.',
      th: 'บ้านสไตล์โมเดิร์นใกล้โรงเรียนและเดอะมอลล์โคราช พร้อมครัวคู่และสนามเด็กเล่น.',
      zh: '近学校与呵叻商场的现代家庭屋，配备双厨房及草坪游乐区。'
    },
    amenities: {
      parking: true,
      garden: true,
      security: true,
      playroom: true
    }
  },
  {
    slug: 'hua-hin-golf-villa',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.HOUSE,
    price: 21500000,
    area: 410,
    beds: 5,
    baths: 5,
    deposit: true,
    location: {
      province: 'Prachuap Khiri Khan',
      district: 'Hua Hin',
      subdistrict: 'Hin Lek Fai',
      lat: 12.5557,
      lng: 99.9113
    },
    images: [
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
      'https://images.unsplash.com/photo-1560449752-3000e62f0ba9',
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?ixid=7'
    ],
    title: {
      en: 'Hua Hin Golf Course Villa',
      th: 'วิลล่าติดสนามกอล์ฟ หัวหิน',
      zh: '华欣高尔夫别墅'
    },
    description: {
      en: 'Private pool villa on international golf course with guest pavilion and outdoor kitchen.',
      th: 'วิลล่าสระส่วนตัวในสนามกอล์ฟระดับนานาชาติ พร้อมเรือนรับรองและครัวกลางแจ้ง.',
      zh: '位于国际高尔夫球场内的私家泳池别墅，设宾客亭与户外厨房。'
    },
    amenities: {
      pool: true,
      parking: true,
      garden: true,
      outdoorKitchen: true,
      security: true
    }
  },
  {
    slug: 'ubon-cultural-hotel',
    status: PropertyStatus.RESERVED,
    type: PropertyType.COMMERCIAL,
    price: 44000000,
    area: 1800,
    baths: 18,
    deposit: true,
    reservedUntil: new Date('2024-10-05'),
    location: {
      province: 'Ubon Ratchathani',
      district: 'Mueang Ubon Ratchathani',
      subdistrict: 'Nai Mueang',
      lat: 15.2287,
      lng: 104.856
    },
    images: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixid=2',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixid=8',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=9'
    ],
    title: {
      en: 'Ubon Boutique Culture Hotel',
      th: 'โรงแรมบูทีควัฒนธรรม อุบลฯ',
      zh: '乌汶文化精品酒店'
    },
    description: {
      en: '32-key riverside hotel with cafe, craft studio, and event courtyard near Thung Si Mueang.',
      th: 'โรงแรมริมแม่น้ำ 32 ห้อง มีคาเฟ่ สตูดิโอศิลป์ และลานกิจกรรม ใกล้ทุ่งศรีเมือง.',
      zh: '临河32间客房的精品酒店，含咖啡馆、手作工坊与活动庭院，邻近Thung Si Mueang。'
    },
    amenities: {
      cafe: true,
      parking: true,
      eventSpace: true,
      security: true
    }
  },
  {
    slug: 'krabi-hillside-land',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.LAND,
    price: 19000000,
    area: 12800,
    location: {
      province: 'Krabi',
      district: 'Mueang Krabi',
      subdistrict: 'Sai Thai',
      lat: 8.0329,
      lng: 98.8833
    },
    images: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixid=4',
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e'
    ],
    title: {
      en: 'Krabi Hillside Land',
      th: 'ที่ดินเชิงเขา กระบี่',
      zh: '甲米山坡土地'
    },
    description: {
      en: 'Gentle sloping land with limestone cliff backdrops and Andaman Sea glimpses.',
      th: 'ที่ดินลาดเอียงอ่อนพร้อมวิวภูผาหินปูนและมองเห็นทะเลอันดามันไกลๆ.',
      zh: '坡度平缓的土地，背靠石灰岩山，远眺安达曼海。'
    },
    amenities: {
      utilities: true,
      roadAccess: true,
      seaView: true
    }
  },
  {
    slug: 'bangkok-modern-office',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.COMMERCIAL,
    price: 58500000,
    area: 980,
    baths: 10,
    location: {
      province: 'Bangkok',
      district: 'Huai Khwang',
      subdistrict: 'Din Daeng',
      lat: 13.7653,
      lng: 100.571
    },
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c',
      'https://images.unsplash.com/photo-1505692794403-55b39e4b7730',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72'
    ],
    title: {
      en: 'Bangkok Modern Office Tower',
      th: 'อาคารสำนักงานโมเดิร์น ดินแดง',
      zh: '曼谷现代写字楼'
    },
    description: {
      en: '12-storey office tower with column-free floors, smart access control, and rooftop canteen.',
      th: 'อาคารสำนักงาน 12 ชั้น พื้นที่โล่งไร้คาน ระบบเข้าออกอัจฉริยะ และโรงอาหารบนดาดฟ้า.',
      zh: '十二层无柱写字楼，配置智能门禁与屋顶餐厅。'
    },
    amenities: {
      parking: true,
      elevator: true,
      backupPower: true,
      cafeteria: true
    }
  },
  {
    slug: 'phitsanulok-suburban-house',
    status: PropertyStatus.RESERVED,
    type: PropertyType.HOUSE,
    price: 4200000,
    area: 180,
    beds: 3,
    baths: 3,
    reservedUntil: new Date('2024-07-25'),
    location: {
      province: 'Phitsanulok',
      district: 'Mueang Phitsanulok',
      subdistrict: 'Tha Thong',
      lat: 16.8214,
      lng: 100.2659
    },
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixid=8',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=10'
    ],
    title: {
      en: 'Phitsanulok Suburban Home',
      th: 'บ้านเดี่ยวชานเมือง พิษณุโลก',
      zh: '彭世洛郊区住宅'
    },
    description: {
      en: 'Bright family home with home office, green backyard, and two-car garage near bypass road.',
      th: 'บ้านครอบครัวโปร่งสว่าง มีห้องทำงาน สนามหญ้าหลังบ้าน และโรงจอดรถสองคัน ใกล้ถนนบายพาส.',
      zh: '采光充足家庭宅，含家庭办公室、后院草坪与双车库，靠近环城公路。'
    },
    amenities: {
      parking: true,
      garden: true,
      security: true,
      homeOffice: true
    }
  },
  {
    slug: 'rayong-smart-factory',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.COMMERCIAL,
    price: 72000000,
    area: 3200,
    baths: 12,
    location: {
      province: 'Rayong',
      district: 'Pluak Daeng',
      subdistrict: 'Map Yang Phon',
      lat: 12.9824,
      lng: 101.1143
    },
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?ixid=11',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixid=1',
      'https://images.unsplash.com/photo-1580894897408-4765bc116c83'
    ],
    title: {
      en: 'Rayong Smart Factory Campus',
      th: 'โรงงานสมาร์ทแฟคตอรี่ ระยอง',
      zh: '罗勇智慧工厂园区'
    },
    description: {
      en: 'Ready-built plant with clean room, solar rooftop, and EEC logistics connectivity.',
      th: 'โรงงานสร้างเสร็จพร้อมคลีนรูม หลังคาพลังงานแสงอาทิตย์ และการเชื่อมต่อโลจิสติกส์ EEC.',
      zh: '配备洁净室与太阳能屋顶的成品工厂，连接东部经济走廊物流网络。'
    },
    amenities: {
      loadingDocks: true,
      solarPanels: true,
      security: true,
      officeWing: true
    }
  },
  {
    slug: 'suratthani-riverfront-condo',
    status: PropertyStatus.RESERVED,
    type: PropertyType.CONDO,
    price: 5600000,
    area: 88,
    beds: 2,
    baths: 2,
    deposit: true,
    reservedUntil: new Date('2024-08-18'),
    location: {
      province: 'Surat Thani',
      district: 'Mueang Surat Thani',
      subdistrict: 'Talat',
      lat: 9.1382,
      lng: 99.3215
    },
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixid=12',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=13',
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?ixid=5'
    ],
    title: {
      en: 'Surat Thani Riverfront Condo',
      th: 'คอนโดริมแม่น้ำสุราษฎร์ธานี',
      zh: '素叻河畔公寓'
    },
    description: {
      en: 'Waterfront residence with jogging deck, co-kitchen, and ferry pier shuttle service.',
      th: 'ที่พักริมแม่น้ำพร้อมดาดฟ้าวิ่ง ครัวส่วนกลาง และบริการชัทเทิลไปท่าเรือเฟอร์รี่.',
      zh: '滨河公寓，配备跑步平台、共享厨房及渡轮码头接驳服务。'
    },
    amenities: {
      pool: true,
      gym: true,
      coworking: true,
      riverDeck: true
    }
  },
  {
    slug: 'trat-sea-view-land',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.LAND,
    price: 31000000,
    area: 11200,
    location: {
      province: 'Trat',
      district: 'Ko Chang',
      subdistrict: 'Ko Chang Tai',
      lat: 12.0005,
      lng: 102.3128
    },
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixid=9',
      'https://images.unsplash.com/photo-1493558103817-58b2924bce98?ixid=4',
      'https://images.unsplash.com/photo-1496483648148-47c686dc86a8'
    ],
    title: {
      en: 'Trat Sea View Ridge Land',
      th: 'ที่ดินเนินเขา วิวทะเล ตราด',
      zh: '达叻海景山岭土地'
    },
    description: {
      en: 'Elevated land on Koh Chang with dual bay views and paved access from main ring road.',
      th: 'ที่ดินเนินสูงบนเกาะช้าง วิวอ่าวสองฝั่ง มีทางคอนกรีตเชื่อมต่อจากถนนรอบเกาะ.',
      zh: '象岛高地地块，可眺望双海湾，铺装道路连通环岛主干道。'
    },
    amenities: {
      seaView: true,
      utilities: true,
      roadAccess: true
    }
  },
  {
    slug: 'bangkok-creative-loft',
    status: PropertyStatus.SOLD,
    type: PropertyType.CONDO,
    price: 8900000,
    area: 98,
    beds: 2,
    baths: 2,
    deposit: false,
    location: {
      province: 'Bangkok',
      district: 'Ratchathewi',
      subdistrict: 'Thanon Phaya Thai',
      lat: 13.7597,
      lng: 100.5366
    },
    images: [
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=11',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?ixid=3',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixid=14'
    ],
    title: {
      en: 'Bangkok Creative Loft',
      th: 'ลอฟต์สำหรับครีเอทีฟ กรุงเทพฯ',
      zh: '曼谷创意阁楼'
    },
    description: {
      en: 'Industrial loft with double-height ceilings, art studio space, and skytrain connectivity.',
      th: 'ลอฟต์สไตล์อินดัสเทรียลเพดานสูงสองชั้น มีพื้นที่สตูดิโอศิลปะและเชื่อม BTS.',
      zh: '工业风挑高阁楼，含艺术工作室空间，并与轻轨相连。'
    },
    amenities: {
      coworking: true,
      gym: true,
      security: true,
      skyDeck: true
    }
  },
  {
    slug: 'lampang-heritage-house',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.HOUSE,
    price: 4700000,
    area: 200,
    beds: 3,
    baths: 3,
    location: {
      province: 'Lampang',
      district: 'Mueang Lampang',
      subdistrict: 'Wiang Nuea',
      lat: 18.2991,
      lng: 99.4929
    },
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?ixid=15',
      'https://images.unsplash.com/photo-1472220625704-91e1462799b2',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=16'
    ],
    title: {
      en: 'Lampang Heritage Home',
      th: 'บ้านโบราณ ลำปาง',
      zh: '南邦古宅'
    },
    description: {
      en: 'Restored Lanna-style residence with carriage house and shaded courtyards in old town.',
      th: 'บ้านเรือนล้านนาปรับปรุงใหม่ พร้อมเรือนเก็บรถม้าและคอร์ทยาร์ดร่มรื่นในเมืองเก่า.',
      zh: '翻新兰纳风格宅邸，带马车房与遮荫庭院，位于老城。'
    },
    amenities: {
      parking: true,
      garden: true,
      security: true,
      heritageFeatures: true
    }
  },
  {
    slug: 'sukhothai-boutique-resort',
    status: PropertyStatus.RESERVED,
    type: PropertyType.COMMERCIAL,
    price: 25500000,
    area: 950,
    baths: 12,
    reservedUntil: new Date('2024-11-01'),
    location: {
      province: 'Sukhothai',
      district: 'Mueang Sukhothai',
      subdistrict: 'Mueang Kao',
      lat: 17.0094,
      lng: 99.8207
    },
    images: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixid=5',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixid=17',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=18'
    ],
    title: {
      en: 'Sukhothai Boutique Resort',
      th: 'รีสอร์ตบูทีค สุโขทัย',
      zh: '素可泰精品度假村'
    },
    description: {
      en: 'Well-reviewed resort near the historical park featuring 18 villas, spa, and bicycle hub.',
      th: 'รีสอร์ตชื่อดังใกล้อุทยานประวัติศาสตร์ มีวิลล่า 18 หลัง สปา และศูนย์จักรยาน.',
      zh: '靠近历史公园的口碑度假村，拥有18栋别墅、SPA及单车中心。'
    },
    amenities: {
      spa: true,
      parking: true,
      pool: true,
      eventSpace: true
    }
  },
  {
    slug: 'nakhonsawan-greenfield-land',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.LAND,
    price: 6700000,
    area: 16000,
    location: {
      province: 'Nakhon Sawan',
      district: 'Phayuha Khiri',
      subdistrict: 'Phayuha',
      lat: 15.365,
      lng: 100.129
    },
    images: [
      'https://images.unsplash.com/photo-1470246973918-29a93221c455?ixid=5',
      'https://images.unsplash.com/photo-1493558103817-58b2924bce98?ixid=6',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixid=7'
    ],
    title: {
      en: 'Nakhon Sawan Greenfield',
      th: 'ที่ดินกรีนฟิลด์ นครสวรรค์',
      zh: '北榄坡绿地'
    },
    description: {
      en: 'Flat farmland plot with irrigation canal access ideal for agri-tech or logistics yard.',
      th: 'ที่ดินเกษตรแบนราบติดคลองชลประทาน เหมาะทำฟาร์มเทคโนโลยีหรือคลังโลจิสติกส์.',
      zh: '平整农田，临灌溉渠，适合农业科技或物流堆场。'
    },
    amenities: {
      irrigation: true,
      roadAccess: true,
      utilities: true
    }
  },
  {
    slug: 'udonthani-city-condo',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.CONDO,
    price: 4300000,
    area: 66,
    beds: 2,
    baths: 2,
    deposit: true,
    location: {
      province: 'Udon Thani',
      district: 'Mueang Udon Thani',
      subdistrict: 'Mak Khaeng',
      lat: 17.4139,
      lng: 102.7873
    },
    images: [
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?ixid=2',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixid=19',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixid=4'
    ],
    title: {
      en: 'Udon Thani City Condo',
      th: 'คอนโดใจกลางเมืองอุดรธานี',
      zh: '乌隆市中心公寓'
    },
    description: {
      en: 'City-center condo next to Central Plaza with smart home controls and sky garden.',
      th: 'คอนโดใจกลางเมืองติดเซ็นทรัลพลาซ่า พร้อมระบบสมาร์ทโฮมและสวนลอยฟ้า.',
      zh: '位于市中心近中央广场的公寓，配备智能家居及空中花园。'
    },
    amenities: {
      pool: true,
      gym: true,
      security: true,
      smartHome: true
    }
  },
  {
    slug: 'maehongson-forest-retreat',
    status: PropertyStatus.SOLD,
    type: PropertyType.HOUSE,
    price: 8800000,
    area: 260,
    beds: 4,
    baths: 4,
    location: {
      province: 'Mae Hong Son',
      district: 'Pai',
      subdistrict: 'Wiang Nuea',
      lat: 19.3617,
      lng: 98.4391
    },
    images: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?ixid=1',
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?ixid=1',
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixid=1'
    ],
    title: {
      en: 'Mae Hong Son Forest Retreat',
      th: 'รีทรีตป่าไม้ แม่ฮ่องสอน',
      zh: '夜丰颂森林度假屋'
    },
    description: {
      en: 'Low-impact retreat with bamboo villas, meditation sala, and organic farm by the Pai River.',
      th: 'รีทรีตที่ใส่ใจสิ่งแวดล้อมพร้อมวิลล่าไม้ไผ่ ศาลานั่งสมาธิ และฟาร์มออร์แกนิกริมแม่น้ำปาย.',
      zh: '环保型度假屋，设竹制别墅、冥想亭及拜河畔有机农场。'
    },
    amenities: {
      spa: true,
      garden: true,
      meditationSala: true,
      riverDeck: true
    }
  },
  {
    slug: 'bangkok-cozy-studio',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.CONDO,
    price: 3200000,
    area: 38,
    beds: 1,
    baths: 1,
    deposit: true,
    location: {
      province: 'Bangkok',
      district: 'Chatuchak',
      subdistrict: 'Chatuchak',
      lat: 13.816,
      lng: 100.561
    },
    images: [
      'https://images.unsplash.com/photo-1493666438817-866a91353ca9',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixid=11',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixid=5'
    ],
    title: {
      en: 'Chatuchak Cozy Studio',
      th: 'สตูดิโออบอุ่น จตุจักร',
      zh: '札都甲温馨单间'
    },
    description: {
      en: 'Efficient studio with built-in storage, city view balcony, and community library.',
      th: 'สตูดิโอจัดสรรพื้นที่คุ้มค่า พร้อมตู้เก็บของบิวท์อิน ระเบียงวิวเมือง และห้องสมุดส่วนกลาง.',
      zh: '布局高效单间，带内嵌收纳、城市景观阳台与公共图书馆。'
    },
    amenities: {
      pool: true,
      gym: true,
      library: true,
      security: true
    }
  },
  {
    slug: 'hatyai-marketplace',
    status: PropertyStatus.RESERVED,
    type: PropertyType.COMMERCIAL,
    price: 33000000,
    area: 1250,
    baths: 8,
    deposit: true,
    reservedUntil: new Date('2024-07-30'),
    location: {
      province: 'Songkhla',
      district: 'Hat Yai',
      subdistrict: 'Hat Yai',
      lat: 7.0017,
      lng: 100.474
    },
    images: [
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?ixid=6',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?ixid=19',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?ixid=12'
    ],
    title: {
      en: 'Hat Yai Marketplace',
      th: 'คอมมูนิตี้มาร์เก็ต หาดใหญ่',
      zh: '合艾社区市集'
    },
    description: {
      en: 'Multi-level market hall with food court, artisanal kiosks, and rooftop urban farm.',
      th: 'อาคารตลาดหลายชั้นพร้อมฟู้ดคอร์ท โซนร้านศิลป์ และฟาร์มเมืองบนชั้นดาดฟ้า.',
      zh: '多层市场大楼，设美食广场、手作摊位与屋顶城市农场。'
    },
    amenities: {
      parking: true,
      elevator: true,
      eventSpace: true,
      rooftopFarm: true
    }
  },
  {
    slug: 'phangnga-private-villa',
    status: PropertyStatus.AVAILABLE,
    type: PropertyType.HOUSE,
    price: 26800000,
    area: 360,
    beds: 4,
    baths: 5,
    deposit: true,
    location: {
      province: 'Phang Nga',
      district: 'Takua Thung',
      subdistrict: 'Khok Kloi',
      lat: 8.2502,
      lng: 98.405
    },
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?ixid=20',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixid=20',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixid=21'
    ],
    title: {
      en: 'Phang Nga Private Villa',
      th: 'วิลล่าส่วนตัว พังงา',
      zh: '攀牙私家别墅'
    },
    description: {
      en: 'Sea-breeze villa with lap pool, cinema room, and dedicated butler quarters minutes from Natai Beach.',
      th: 'วิลลารับลมทะเลพร้อมสระว่ายน้ำระบบแลป ห้องดูหนัง และห้องพักพนักงานบริการ ใกล้หาดนาใต้.',
      zh: '临海微风别墅，设长泳池、影院室及管家套房，距离那泰海滩数分钟。'
    },
    amenities: {
      pool: true,
      gym: true,
      cinema: true,
      butlerSuite: true
    }
  },
  {
    slug: 'lopburi-solar-farm',
    status: PropertyStatus.RESERVED,
    type: PropertyType.LAND,
    price: 45500000,
    area: 24000,
    deposit: true,
    reservedUntil: new Date('2024-12-15'),
    location: {
      province: 'Lop Buri',
      district: 'Khok Samrong',
      subdistrict: 'Nong Tao',
      lat: 15.0904,
      lng: 100.7332
    },
    images: [
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixid=4',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixid=8',
      'https://images.unsplash.com/photo-1470246973918-29a93221c455?ixid=9'
    ],
    title: {
      en: 'Lopburi Solar Farm Site',
      th: 'พื้นที่โซลาร์ฟาร์ม ลพบุรี',
      zh: '华富里太阳能农场用地'
    },
    description: {
      en: 'Level 15-rai site with three-phase power, highway frontage, and environmental impact study complete.',
      th: 'พื้นที่ 15 ไร่ระดับเดียว มีไฟฟ้า 3 เฟส ติดทางหลวง และมีรายงานผลกระทบสิ่งแวดล้อมครบ.',
      zh: '面积15莱的平坦地块，配备三相电力、临高速路，并已完成环境影响评估。'
    },
    amenities: {
      utilities: true,
      highwayFrontage: true,
      solarReady: true
    }
  }
];

const locationCache = new Map<string, string>();

type LocationInput = PropertySeed['location'];

async function ensureLocation(location: LocationInput): Promise<string> {
  const key = `${location.province}|${location.district ?? ''}|${location.subdistrict ?? ''}`;
  if (locationCache.has(key)) {
    return locationCache.get(key)!;
  }

  const existing = await prisma.location.findFirst({
    where: {
      province: location.province,
      district: location.district,
      subdistrict: location.subdistrict
    }
  });

  if (existing) {
    const updateData: { lat?: number | null; lng?: number | null } = {};
    if (typeof location.lat === 'number' && location.lat !== existing.lat) {
      updateData.lat = location.lat;
    }
    if (typeof location.lng === 'number' && location.lng !== existing.lng) {
      updateData.lng = location.lng;
    }

    if (Object.keys(updateData).length > 0) {
      const updated = await prisma.location.update({
        where: { id: existing.id },
        data: updateData
      });
      locationCache.set(key, updated.id);
      return updated.id;
    }

    locationCache.set(key, existing.id);
    return existing.id;
  }

  const created = await prisma.location.create({
    data: {
      province: location.province,
      district: location.district,
      subdistrict: location.subdistrict,
      lat: location.lat,
      lng: location.lng
    }
  });
  locationCache.set(key, created.id);
  return created.id;
}

function buildTranslations(property: PropertySeed) {
  return [
    {
      locale: 'en',
      title: property.title.en,
      description: property.description.en,
      amenities: property.amenities
    },
    {
      locale: 'th',
      title: property.title.th,
      description: property.description.th,
      amenities: property.amenities
    },
    {
      locale: 'zh',
      title: property.title.zh,
      description: property.description.zh,
      amenities: property.amenities
    }
  ];
}

async function seedAdminUser() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      role: Role.ADMIN,
      isActive: true
    },
    create: {
      username: 'admin',
      passwordHash,
      role: Role.ADMIN
    }
  });
}

async function seedProperties() {
  const defaultPublishedAt = new Date('2024-01-01T00:00:00.000Z');
  for (const property of propertySeeds) {
    const locationId = await ensureLocation(property.location);
    const publishedAt = property.publishedAt ?? defaultPublishedAt;
    const workflowChangedAt = publishedAt;

    await prisma.property.upsert({
      where: { slug: property.slug },
      update: {
        status: property.status,
        type: property.type,
        price: property.price,
        area: property.area ?? null,
        beds: property.beds ?? null,
        baths: property.baths ?? null,
        deposit: property.deposit ?? false,
        reservedUntil: property.reservedUntil ?? null,
        workflowState: WorkflowState.PUBLISHED,
        workflowChangedAt,
        publishedAt,
        location: {
          connect: { id: locationId }
        },
        images: {
          deleteMany: {},
          create: property.images.map((url, order) => ({ url, order }))
        },
        i18n: {
          deleteMany: {},
          create: buildTranslations(property)
        }
      },
      create: {
        slug: property.slug,
        status: property.status,
        type: property.type,
        price: property.price,
        area: property.area ?? null,
        beds: property.beds ?? null,
        baths: property.baths ?? null,
        deposit: property.deposit ?? false,
        reservedUntil: property.reservedUntil ?? null,
        workflowState: WorkflowState.PUBLISHED,
        workflowChangedAt,
        publishedAt,
        location: {
          connect: { id: locationId }
        },
        images: {
          create: property.images.map((url, order) => ({ url, order }))
        },
        i18n: {
          create: buildTranslations(property)
        }
      }
    });
  }
}

async function main() {
  await prisma.$connect();
  await seedAdminUser();
  await seedProperties();
  console.log('Seeding completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
