export interface SymposiumEvent {
  id: string;
  name: string;
  tagline: string;
  tag: string;
  category: string;
  teamLabel: string;
  participationText: string;
  feeNonMember: number;
  feeMember: number;
  min: number;
  max: number;
  slot: string;
  time: string;
  venue: string;
  project?: boolean;
  prizes: {
    first: string;
    second: string;
  };
  highlights: string[];
  rules: string[];
  rounds: { title: string; desc: string }[];
}

export const SYMPOSIUM_CONFIG = {
  name: "NexusVerse 2K26",
  tagline: "National Level Technical Symposium",
  organizer: "IEEE-SB NBKRIST",
  institution: "N.B.K.R. Institute of Science & Technology",
  location: "Vidyanagar, Kota Mandal, Tirupati District, Andhra Pradesh - 524413",
  date: "29 October 2026",
  time: "9:00 AM IST",
  email: "nexusverse@nbkrist.org",
  totalPrizePool: "Exciting Cash Prizes & Awards (Revealing Soon!)",
  gstPercent: 0,
  promoCodes: {
    "IEEE10": 10,
    "NEXUS20": 20,
    "NBKRIST": 15,
    "EARLYBIRD": 10
  } as Record<string, number>,
  coordinators: [
    {
      name: "N. Upali",
      role: "Student Chair, IEEE-SB",
      phone: "6305349156",
      phoneFormatted: "+91 63053 49156"
    },
    {
      name: "K. Guravaiah",
      role: "Technical Lead & Organizing Secretary",
      phone: "9491501919",
      phoneFormatted: "+91 94915 01919"
    },
    {
      name: "K. Rithika",
      role: "Treasurer & Registration Desk",
      phone: "7708731095",
      phoneFormatted: "+91 77087 31095"
    }
  ],
  razorpayMe: {
    url: "https://razorpay.me/@veluriprasanth",
    handle: "@veluriprasanth",
    name: "VELURI PRASANTH"
  }
};

export const EVENTS: SymposiumEvent[] = [
  {
    id: "ctf",
    name: "FLAGHUNT",
    tagline: "Find the Flag. Crack the Code. Own the Hunt.",
    tag: "FLAGHUNT is a cybersecurity challenge where participants solve different technical puzzles to find hidden flags. Challenges may include web exploitation, cryptography, and other security-related tasks. Teams earn progress by finding and submitting the correct flags.",
    category: "Cybersecurity – Capture the Flag (CTF)",
    teamLabel: "Exactly 2 Participants",
    participationText: "Exactly 2 participants per team. Individual participation is not allowed.",
    feeNonMember: 200,
    feeMember: 150,
    min: 2,
    max: 2,
    slot: "10:00 AM – 12:00 PM",
    time: "10:00 AM – 12:00 PM",
    venue: "Advanced Computing Lab 1",
    prizes: {
      first: "Cash Prize (Revealing Soon) + Winner Trophy & Merit Certificate",
      second: "Cash Prize (Revealing Soon) + Runner-up Trophy & Merit Certificate"
    },
    highlights: [
      "Cybersecurity challenges: Web Exploitation, Cryptography, Security Tasks",
      "Earn progress by finding and submitting authorized flags",
      "Strict 2-member collaborative cybersecurity team battle"
    ],
    rules: [
      "Each team must consist of two participants.",
      "Individual entries are not allowed.",
      "Participants must solve the given challenges and submit the flags as instructed by the organizers.",
      "Teams must not attack or interfere with systems outside the authorized event environment.",
      "Sharing flags or solutions with other teams is not allowed unless the organizers permit it.",
      "The organizers’ decisions regarding scoring and disqualification will be final."
    ],
    rounds: [
      { title: "Challenge Phase 1: Cryptography & Security Puzzles", desc: "Solve technical cryptographic puzzles, decipher ciphers, and find hidden security flags." },
      { title: "Challenge Phase 2: Web Exploitation & System Flags", desc: "Identify security vulnerabilities and extract authorized flags within the event environment." }
    ]
  },
  {
    id: "expo",
    name: "INNOVRUSH",
    tagline: "Think Fast. Build Faster. Innovate Smarter.",
    tag: "INNOVRUSH is a timed innovation challenge. The problem statements will be announced first, and participants will have 10 minutes to understand and analyze them. After that, they will get 90 minutes to build a prototype that addresses the selected problem.",
    category: "Rapid Innovation and Prototyping",
    teamLabel: "1–2 Participants",
    participationText: "1–2 participants per team.",
    feeNonMember: 200,
    feeMember: 150,
    min: 1,
    max: 2,
    slot: "10:00 AM – 12:00 PM",
    time: "10:00 AM – 12:00 PM",
    venue: "Central Innovation Pavilion",
    project: true,
    prizes: {
      first: "Cash Prize (Revealing Soon) + Winner Shield & Merit Certificate",
      second: "Cash Prize (Revealing Soon) + Runner-up Shield & Merit Certificate"
    },
    highlights: [
      "10 minutes to analyze & understand announced problem statements",
      "90-minute fast-paced prototype building sprint",
      "Explain your idea, approach, and working prototype before the judges"
    ],
    rules: [
      "Each team may have one or two participants.",
      "Participants must use the problem statement provided by the organizers.",
      "The first 10 minutes are for analyzing the problem; the following 90 minutes are for building the prototype.",
      "The prototype must be developed within the allotted time.",
      "Participants should be ready to explain their idea, approach, and prototype when time is called.",
      "Plagiarism or presenting another person’s work as your own is not allowed.",
      "The judges’ decision will be final."
    ],
    rounds: [
      { title: "Phase 1: Problem Statement Analysis (10 Mins)", desc: "Organizers announce problem statements; participants have 10 minutes to analyze and formulate their solution strategy." },
      { title: "Phase 2: Rapid Prototype Building (90 Mins)", desc: "90 minutes to construct and develop a prototype that directly addresses the chosen problem." },
      { title: "Phase 3: Idea & Prototype Evaluation", desc: "Demonstrate and explain your approach, engineering choices, and prototype to the jury." }
    ]
  },
  {
    id: "code",
    name: "CODENANO",
    tagline: "Break the Rules of Coding, Not the Constraints.",
    tag: "CODENANO is an individual coding event based on simple data structures and algorithms (DSA) problems. Each problem comes with a special condition, such as solving it without using an if condition or a for loop. Participants are judged on solving the problem while following its stated coding constraints—not only on leaderboard position.",
    category: "DSA and Constraint-Based Coding",
    teamLabel: "Individual (1 Participant)",
    participationText: "Individual event – one participant per entry.",
    feeNonMember: 200,
    feeMember: 150,
    min: 1,
    max: 1,
    slot: "10:00 AM – 12:00 PM",
    time: "10:00 AM – 12:00 PM",
    venue: "Main Computer Centre",
    prizes: {
      first: "Cash Prize (Revealing Soon) + Winner Trophy & Merit Certificate",
      second: "Cash Prize (Revealing Soon) + Runner-up Trophy & Merit Certificate"
    },
    highlights: [
      "Simple DSA problems paired with unique special constraints",
      "Restrictions: e.g., solve without 'if' conditions or 'for' loops",
      "Scored on algorithmic correctness and strict constraint compliance"
    ],
    rules: [
      "Only individual participation is allowed.",
      "Participants must solve the given DSA problems using the specified programming language or platform.",
      "Every problem’s stated restrictions must be followed. For example, if a problem forbids if conditions or for loops, they must not be used.",
      "Solutions that produce the correct output but violate the specified conditions may not be accepted.",
      "Participants must write and submit their own code; collaboration or code sharing is not allowed during the event.",
      "Evaluation will consider correctness and compliance with the conditions, not leaderboard position alone.",
      "The organizers’ and judges’ decisions will be final."
    ],
    rounds: [
      { title: "Round 1: Constraint-Based Problem Sprint", desc: "Solve the given algorithmic problems while strictly obeying unique restrictions (e.g. no conditional branching or no loops)." },
      { title: "Round 2: Evaluation & Constraint Inspection", desc: "Judges review solution scripts for both computational correctness and strict compliance with stated constraints." }
    ]
  },
  {
    id: "bug",
    name: "TECHQUEST",
    tagline: "Ideas into Innovations. Prototypes into Possibilities.",
    tag: "TECHQUEST gives participants a chance to present a technical idea or project. Participants must prepare a PowerPoint presentation (PPT) or a working prototype and explain the problem, their solution, the technology used, and the possible impact of their project.",
    category: "Project Expo and Idea Pitching",
    teamLabel: "1–2 Participants",
    participationText: "1–2 participants per team.",
    feeNonMember: 200,
    feeMember: 150,
    min: 1,
    max: 2,
    slot: "10:00 AM – 12:00 PM",
    time: "10:00 AM – 12:00 PM",
    venue: "ECE Seminar Hall",
    project: true,
    prizes: {
      first: "Cash Prize (Revealing Soon) + Winner Trophy & Certificate",
      second: "Cash Prize (Revealing Soon) + Runner-up Trophy & Certificate"
    },
    highlights: [
      "Present either a PowerPoint presentation (PPT) or a working prototype",
      "Explain problem, proposed solution, technology used, and expected impact",
      "Interactive technical demonstration and live jury defense"
    ],
    rules: [
      "Each team may have one or two participants.",
      "Participants must present either a PPT or a working prototype.",
      "The presentation should clearly explain the problem, proposed solution, technology used, and expected outcome.",
      "Participants must bring their presentation or prototype materials and ensure they are ready for the event.",
      "Teams should be prepared to answer questions from the judges.",
      "Projects must be original or properly acknowledge any third-party work, assets, or references used.",
      "Judging will be based on factors such as innovation, usefulness, technical execution, and clarity of presentation.",
      "The judges’ decision will be final."
    ],
    rounds: [
      { title: "Stage 1: Presentation / Working Prototype Demonstration", desc: "Deliver your PPT or showcase your working prototype, detailing the technical architecture and real-world impact." },
      { title: "Stage 2: Technical Q&A with Judges", desc: "Engage in an interactive evaluation round answering queries from the judging panel." }
    ]
  },
  {
    id: "canva",
    name: "DESIGNOVA",
    tagline: "Imagine It. Design It. Make It Unforgettable.",
    tag: "DESIGNOVA is an individual poster-design challenge. A theme will be given, and each participant must create a poster based on that theme. The design should communicate the idea clearly and creatively through layout, colors, typography, and visual elements.",
    category: "Theme-Based Poster Design",
    teamLabel: "Individual (1 Participant)",
    participationText: "Individual event – one participant per entry.",
    feeNonMember: 200,
    feeMember: 150,
    min: 1,
    max: 1,
    slot: "10:00 AM – 12:00 PM",
    time: "10:00 AM – 12:00 PM",
    venue: "Design & Multimedia Studio",
    prizes: {
      first: "Cash Prize (Revealing Soon) + Winner Trophy & Certificate",
      second: "Cash Prize (Revealing Soon) + Runner-up Trophy & Certificate"
    },
    highlights: [
      "Theme revealed at the start of the challenge by organizers",
      "Communicate ideas creatively through layout, colors, typography & visual elements",
      "Judged on creativity, visual appeal, relevance to theme, and clarity"
    ],
    rules: [
      "Only individual participation is allowed.",
      "The poster must be based on the theme provided by the organizers.",
      "Participants must complete and submit the design within the allotted time.",
      "The poster should be original and created by the participant.",
      "Participants must follow the design format, dimensions, software, and submission instructions announced by the organizers.",
      "Inappropriate, offensive, or unrelated content is not allowed.",
      "Judging may consider creativity, visual appeal, relevance to the theme, and clarity of communication.",
      "The judges’ decision will be final."
    ],
    rounds: [
      { title: "Phase 1: Theme Announcement & Poster Creation", desc: "Receive the official symposium theme and design an original poster within the allotted time." },
      { title: "Phase 2: Submission & Aesthetic Evaluation", desc: "Submit your final artwork for evaluation based on composition, theme relevance, and visual communication." }
    ]
  }
];

export const TIMELINE = [
  { 
    time: "09:00 AM – 09:40 AM", 
    title: "Inauguration Ceremony", 
    venue: "Seminar Hall, NBKRIST", 
    note: "Official opening ceremony, lighting of the lamp & keynote address by dignitaries" 
  },
  { 
    time: "09:40 AM – 10:00 AM", 
    title: "Allocation & Lab Setup", 
    venue: "Respective Labs & Seminar Halls", 
    note: "Delegate reporting, verification, lab seating allocation, and system setup" 
  },
  { 
    time: "10:00 AM – 12:00 PM", 
    title: "Technical Events", 
    venue: "Designated Labs & Seminar Halls", 
    note: "FLAGHUNT, INNOVRUSH, CODENANO, TECHQUEST & DESIGNOVA competitions" 
  },
  { 
    time: "12:00 PM – 01:30 PM", 
    title: "Lunch Break", 
    venue: "Campus Dining Hall", 
    note: "Complimentary networking lunch and refreshments for all registered delegates" 
  },
  { 
    time: "01:30 PM – 03:30 PM", 
    title: "Spot Events & Interactive Challenges", 
    venue: "Central Courtyard & Seminar Halls", 
    note: "Exciting on-spot events, technical mini-games, and engaging open activities" 
  },
  { 
    time: "03:30 PM – 04:00 PM", 
    title: "Prize Distribution & Valedictory", 
    venue: "Seminar Hall, NBKRIST", 
    note: "Felicitation ceremony, IEEE shields, trophies & merit certificate presentation" 
  }
];

export const FAQS = [
  {
    q: "Who is eligible to participate in NexusVerse 2K26?",
    a: "Students from any recognized college or polytechnic institution (B.Tech, B.E., M.Tech, MCA, BCA, B.Sc) are eligible. You must bring a valid physical College ID card on the day of the event."
  },
  {
    q: "How does the IEEE membership discount work?",
    a: "Active IEEE student members enjoy reduced delegate fees across all events (e.g. ₹150 instead of ₹200). Simply select 'IEEE Member' on the registration form and enter your 8-digit IEEE member number."
  },
  {
    q: "Can I register for multiple events?",
    a: "No. Participants are allowed to participate in only one technical event because all technical events run simultaneously from 10:00 AM to 12:00 PM. In the afternoon session (1:30 PM – 3:30 PM), everyone can participate in the spot events!"
  },
  {
    q: "How do team registrations work?",
    a: "One team lead registers and completes the payment for the entire team. In the event card, provide your official Team Name and list each member's full name. Individual registration passes and certificates will be prepared for all team members."
  },
  {
    q: "Will everyone receive a certificate or prize?",
    a: "Yes! All registered participants will receive an official physical Certificate of Participation endorsed by IEEE-SB NBKRIST. Winners and runner-ups will receive exciting Cash Prizes (amounts to be revealed at the symposium!), prestigious IEEE trophies, and merit certificates."
  },
  {
    q: "What is included with the registration fee?",
    a: "The registration fee covers participation in the selected events, official IEEE delegate kit, high-speed Wi-Fi access, workshop/competition resources, lunch, and refreshments."
  },
  {
    q: "What is the cancellation and refund policy?",
    a: "Cancellations requested at least 48 hours before the symposium (by 27 October 2026, 11:59 PM) are eligible for a 90% refund. Please contact the student coordinators via phone or WhatsApp with your Registration ID."
  },
  {
    q: "How do I reach the venue?",
    a: "N.B.K.R. Institute of Science & Technology is located in Vidyanagar, Kota Mandal, Tirupati District (near Gudur / Nayudupeta railway junctions). Buses and auto transport are available from Gudur Junction and Nayudupeta."
  }
];
