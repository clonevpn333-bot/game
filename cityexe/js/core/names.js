export const FIRST = ['Marcus','Elena','Dev','Priya','Jonah','Tess','Omar','Lucia','Wes','Hana','Theo','Imani','Caleb','Rosa','Nikolai','June','Andre','Mei','Silas','Grace','Rafael','Nadia','Owen','Leila','Felix','Ines','Gus','Zara','Malik','Ruth','Kenji','Mara','Dmitri','Anya','Hector','Clara','Tobias','Yara','Ezra','Paloma','Isaac','Freya','Victor','Esme','Reuben','Lena','Hugo','Ada','Bruno','Selene','Cyrus','Vera','Abel','Noor','Ivan','Della','Quentin','Sasha','Rowan','Tamsin','Arlo','Bea','Desmond','Ottilie','Jasper','Mina','Luther','Wren','Santiago','Fern','Kofi','Iris','Mateo','Nell','Dashiell','Pia','Ronan','Saoirse','Ibrahim','Lottie','Emil','Odette','Pavel','Marisol','Cole','Juno','Rami','Thea','Lionel','Ama','Ignacio','Celeste','Boris','Kit','Alonzo','Margo','Yusuf','Dina','Harlan','Petra','Sami','Lou'];
export const LAST = ['Reed','Okafor','Vance','Lindqvist','Moreau','Castillo','Brennan','Nakamura','Hollis','Petrov','Abara','Duarte','Whitlock','Sato','Kessler','Marsh','Oyelaran','Fontaine','Calloway','Ibarra','Novak','Quist','Harrow','Delacroix','Tran','Mbeki','Grady','Lowell','Ferro','Achterberg','Bishop','Szabo','Rourke','Valdez','Haddad','Pryce','Ewing','Kowalski','Sorensen','Amari','Blackwood','Chen','Dunmore','Esposito','Faulk','Gentry','Holm','Iversen','Jaramillo','Kaur','Lark','Mendel','Nygaard','Ortega','Pike','Quinlan','Ross','Stroud','Thorne','Underhill','Vasquez','Wilder','Yoon','Zeller','Ashby','Corwin','Draper','Ellery','Finch','Garrow','Hale','Ingram','Juarez','Kemp','Ludlow','Mercer','Nash','Orr','Pell','Rhee','Sable','Tolliver','Voss','Wade','Yardley'];

export const STREETS_NS = ['Harbor St','Kessler Ave','Mill Rd','Riverbank Dr','Quay St','Union Ave','Grand Ave','Fifth Ave','Lowell St','Parkside Ave','Ironside Rd'];
export const STREETS_EW = ['Dock Rd','Foundry St','Canal St','Market St','Hill St','Central Blvd','Elm St','Maple Ave','Birch Ln','Cedar St','Southgate Rd'];

const CAP = (s) => s[0].toUpperCase() + s.slice(1);

export const BIZ_TEMPLATES = {
  grocery: ['{L} Market', 'Fresh Corner', '{L} Grocers', 'Daily Basket', 'Greenleaf Foods'],
  convenience: ['Quik Stop', '24/7 Mart', 'Corner Mart', 'Night Owl Convenience', 'Speedy Stop'],
  restaurant: ['{L}\'s Kitchen', 'The Copper Pot', 'Blue Plate Diner', 'Casa {L}', 'Harbor Grill', 'Noodle House', 'Mama {F}\'s'],
  cafe: ['Bean There', 'Morning Grind', '{F}\'s Coffee', 'Steam & Leaf', 'The Daily Cup'],
  bar: ['The Rusty Anchor', '{L}\'s Tavern', 'Neon Room', 'Last Call', 'The Gearhouse'],
  clothing: ['{L} & Co.', 'Threadline', 'Urban Fit', 'Second Skin'],
  electronics: ['Volt Electronics', 'Circuit Shack', 'Pixel Point'],
  pharmacy: ['CityCare Pharmacy', '{L} Drugs', 'Green Cross Pharmacy'],
  autoshop: ['{L} Automotive', '{L} Auto Repair', 'Torque & Tire'],
  office: ['{L} Holdings', 'Meridian Group', '{L} Partners', 'Northstar Logistics', 'Atlas Insurance', 'Quantum Dynamics', 'Brightline Media', '{L} & {L2} LLP'],
  factory: ['{L} Steelworks', 'Ironworks Fabrication', 'Delta Plastics', '{L} Manufacturing'],
  warehouse: ['{L} Distribution', 'Portside Storage', 'Metro Freight'],
  gas: ['FuelStop', 'Petro {L}', 'Express Gas'],
  gym: ['Iron Temple Gym', '{L} Fitness'],
  hotel: ['The Grand {L}', 'Riverside Hotel'],
  bank: ['First Silver Bank', '{L} Savings & Loan', 'Harbor Trust', 'Union Federal', 'Meridian Bank'],
  casino: ['The Golden Ace', 'Lucky Seven Casino', 'Royal Flush Casino'],
  nightclub: ['Pulse', 'Neon Jungle', 'Club Static', 'Velvet Underground', 'Afterglow'],
  lounge: ['The Velvet Lounge', 'Scarlet Room', 'Starlight Cabaret', 'The Gilded Cage'],
  gunstore: ['{L} Arms', 'Liberty Firearms', 'Frontier Guns & Ammo'],
};

const usedNames = new Set();
export function genBizName(rng, type, owner) {
  const t = BIZ_TEMPLATES[type] || ['{L} Company'];
  let name = '';
  for (let k = 0; k < 8; k++) {
    const tpl = rng.pick(t);
    name = tpl.replace('{L}', owner ? owner.last : rng.pick(LAST)).replace('{L2}', rng.pick(LAST)).replace('{F}', owner ? owner.first : rng.pick(FIRST));
    if (!usedNames.has(name)) break;
    if (k > 3) name = name + ' ' + rng.pick(['II', 'East', 'West', 'Express', 'Uptown', 'on Main']);
  }
  usedNames.add(name);
  return name;
}

const APT_PREFIX = ['Westpoint', 'Harbor View', 'Kessler', 'Elm Court', 'Maple', 'Union', 'Riverside', 'Foundry', 'Canal', 'Parkside', 'Linden', 'Ashby', 'Hollis', 'Monarch', 'Sterling'];
export function genAptName(rng, districtName) {
  const base = rng.chance(0.35) ? districtName.split(' ')[0] : rng.pick(APT_PREFIX);
  return `${base} ${rng.pick(['Apartments', 'Lofts', 'Residences', 'Tower', 'Court', 'Flats'])}`;
}
export function genTowerName(rng) {
  return rng.pick(['Meridian', 'Halcyon', 'Sterling', 'Atlas', 'Pinnacle', 'Vantage', 'Corvus', 'Apex', 'Monarch', 'Orion', 'Beacon', 'Summit']) + ' ' + rng.pick(['Tower', 'Center', 'Plaza', 'Building', 'One']);
}
export { CAP };
