const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function main() {
  const buf = fs.readFileSync('public/assets/aistudio/BOB_GEN_EMP_27-10-2026_-_Copy_3e6297a2.pdf');
  const parser = new PDFParse(new Uint8Array(buf));
  const res = await parser.getText();

  const allEmployees = [];

  for (let pageIdx = 0; pageIdx < 10; pageIdx++) {
    const p1Lines = res.pages[pageIdx].text.split('\n').map(l => l.trim()).filter(Boolean);
    const p2Lines = res.pages[pageIdx + 10].text.split('\n').map(l => l.trim()).filter(Boolean);
    const p3Lines = res.pages[pageIdx + 20].text.split('\n').map(l => l.trim()).filter(Boolean);

    // Skip header line (index 0)
    for (let r = 1; r < p1Lines.length; r++) {
      const line1 = p1Lines[r];
      const line2 = p2Lines[r];
      const line3 = p3Lines ? p3Lines[r] : '';

      // Line 1: EC_NO (digits or C-digits) ... DOJ (DD-MM-YYYY) Gender Cadre Grade
      // Example: "100740 Mr PATEL VATSALA SINGH 10-06-2013 Male Officer JM1"
      // Match from end: Grade, Cadre, Gender, DOJ
      const m1 = line1.match(/^([A-Z0-9]+)\s+(.+?)\s+(\d{2}-\d{2}-\d{4})\s+(Male|Female)\s+(.+?)\s+([A-Z0-9]+)$/i);
      
      let ecNo = '';
      let name = '';
      let doj = '';
      let gender = '';
      let cadre = '';
      let grade = '';

      if (m1) {
        ecNo = m1[1];
        name = m1[2].trim();
        doj = m1[3];
        gender = m1[4];
        cadre = m1[5].trim();
        grade = m1[6].trim();
      } else {
        const parts = line1.split(/\s+/);
        ecNo = parts[0];
        grade = parts[parts.length - 1];
        cadre = parts[parts.length - 2];
        gender = parts[parts.length - 3];
        doj = parts[parts.length - 4];
        name = parts.slice(1, parts.length - 4).join(' ');
      }

      // Line 2: Position Function Organization Name Mobile Number
      // Example: "BRANCH OPERATIONS BAGDANA 9977701877"
      // Example: "CREDIT OFFICER (RETAIL ONLY) BHAVNAGAR,RO BHAVNAGAR 9807422313"
      let phone = '';
      let rest = line2 || '';
      const phoneMatch = rest.match(/(\d{10})$/);
      if (phoneMatch) {
        phone = phoneMatch[1];
        rest = rest.slice(0, -phoneMatch[0].length).trim();
      }

      // Known positions list to split Position from Branch accurately
      const knownPositions = [
        'BRANCH OPERATIONS',
        'BRANCH HEAD',
        'CREDIT OFFICER (RETAIL ONLY)',
        'CREDIT OFFICER (AGRI ONLY)',
        'CREDIT MONITORING',
        'CREDIT HEAD',
        'CREDIT',
        'SENIOR CUSTOMER SERVICE ASSOCIATE(CASH)',
        'SPECIAL CUSTOMER SERVICE ASSOCIATE',
        'CUSTOMER SERVICE ASSOCIATE',
        'SPECIAL OFFICE ASSISTANT',
        'SENIOR OFFICE ASSISTANT',
        'OFFICE ASSISTANT',
        'SWACHHTA SAHAYAK EVAM SAHAYAK',
        'JOINT MANAGER',
        'OUTBOUND SALES_AUTO LOANS',
        'OUTBOUND SALES',
        'TASK FORCE - RECOVERY CELL',
        'FOREX',
        'C.A.M.P',
        'RAPC CREDIT PROCESSING',
        'RAPC HEAD',
        'INSPECTION _ AUDIT',
        'PRIORITY SECTOR',
        'REGIONAL HR HEAD',
        'REGIONAL HR',
        'REGIONAL HEAD RRB',
        'REGIONAL HEAD',
        'REGIONAL WEALTH MANAGER',
        'WEALTH EXECUTIVE',
        'RBDM',
        'SMELF CREDIT',
        'SMELF HEAD',
        'FINANCIAL INCLUSION',
        'PLANNING',
        'OPERATIONS _ SERVICES',
        'TRAINEE',
        'LBO_RELATIONSHIP_MANAGER',
        'OFFICIAL LANGUAGE',
        'CURRENCY CHEST INCHARGE',
        'CURRENCY CHEST CUSTODIAN',
        'PREMISES_EQUIPMENT',
        'DY REGIONAL HEAD',
        'AREA RECEIVABLES MANAGER (ALL PRODUCTS)',
        'MSME-SALES',
        'LEGAL',
        'RECOVERY',
        'RISK MANAGEMENT',
        'COMPLIANCE',
        'RETAIL LENDING',
        'IT',
        'CASA',
      ];

      let position = 'STAFF';
      let branch = rest;

      for (const pos of knownPositions) {
        if (rest.startsWith(pos)) {
          position = pos;
          branch = rest.slice(pos.length).trim();
          break;
        }
      }

      // If rest has comma like "BHAVNAGAR,KRISHNANAGAR"
      // Clean up branch name
      branch = branch.replace(/^,\s*/, '').trim();

      // Email from line 3 if present
      let email = '';
      if (line3) {
        const emails = line3.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
        if (emails && emails.length > 0) {
          email = emails[emails.length - 1]; // prefer bank's email
        }
      }

      allEmployees.push({
        id: `emp_${ecNo}`,
        ecNo,
        name,
        doj,
        gender,
        cadre,
        grade,
        position,
        branch,
        phone,
        email,
      });
    }
  }

  console.log(`Parsed ${allEmployees.length} employees successfully.`);

  // Write out TS file
  const fileContent = `export interface RegionalEmployee {
  id: string;
  ecNo: string;
  name: string;
  doj: string;
  gender: string;
  cadre: string;
  grade: string;
  position: string;
  branch: string;
  phone: string;
  email: string;
}

export const BHAVNAGAR_REGIONAL_STAFF: RegionalEmployee[] = ${JSON.stringify(allEmployees, null, 2)};
`;

  fs.writeFileSync('src/data/bhavnagarStaff.ts', fileContent, 'utf-8');
  console.log('Saved src/data/bhavnagarStaff.ts');
}

main().catch(console.error);
