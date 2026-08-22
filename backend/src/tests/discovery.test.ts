import { DiscoveryEngine } from "../discovery/discovery-engine.js";
import { SourceRegistry } from "../discovery/source-registry.js";
import { parseStipend, normalizeMode } from "../discovery/normalization.js";
import { deduplicateInternships } from "../discovery/deduplication.js";
import { rankInternship } from "../discovery/ranking.js";
import { NormalizedInternship } from "../discovery/source-adapter.js";
import { profileStorage } from "../storage/profile.storage.js";

async function runDiscoveryTestSuite() {
  console.log("==================================================");
  console.log("SCOUTLY MULTI-SOURCE DISCOVERY TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(description: string, condition: boolean) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${description}`);
      process.exitCode = 1;
    }
  }

  // 1. Stipend Normalization Tests
  console.log("\n[Group 1] Stipend Normalization");
  const s1 = parseStipend("₹15,000 /month");
  assert("Parse standard INR stipend: min=15000", s1.min === 15000 && s1.currency === "INR");

  const s2 = parseStipend("15k - 25k");
  assert("Parse K multiplier range: min=15000, max=25000", s2.min === 15000 && s2.max === 25000);

  const s3 = parseStipend("$500/month");
  assert("Parse USD stipend: min=500, currency=USD", s3.min === 500 && s3.currency === "USD");

  const s4 = parseStipend("Unpaid");
  assert("Parse Unpaid stipend: min=0", s4.min === 0 && s4.display.includes("Unpaid"));

  const s5 = parseStipend("Competitive / Not Disclosed");
  assert("Parse Not Disclosed: min=null", s5.min === null);

  // 2. Mode & Location Normalization
  console.log("\n[Group 2] Mode & Location Normalization");
  const m1 = normalizeMode("Remote (Work from home)");
  assert("Normalize Work from home -> remote", m1.mode === "remote");

  const m2 = normalizeMode("Hybrid - Bengaluru, Karnataka");
  assert("Normalize Hybrid -> hybrid", m2.mode === "hybrid");

  const m3 = normalizeMode("In Office - Mumbai");
  assert("Normalize In Office -> onsite", m3.mode === "onsite");

  // 3. Deduplication Tests
  console.log("\n[Group 3] Deduplication & Source Priority");
  const duplicateItems: NormalizedInternship[] = [
    {
      id: "agg-01",
      title: "Cyber Security Analyst Intern",
      company: "SecureLink Pvt Ltd",
      description: "Short desc",
      location: "Remote",
      mode: "remote",
      stipend: parseStipend("₹15,000 /month"),
      duration: "3 Months",
      skills: ["Cybersecurity", "Python"],
      experience: null,
      eligibility: null,
      deadline: null,
      postedDate: null,
      source: "Indeed India", // Priority 4
      sourceUrl: "https://indeed.com",
      applicationUrl: "https://indeed.com/job/1",
      organizationUrl: null,
      tags: ["security"],
      verified: true,
      discoveredAt: new Date().toISOString()
    },
    {
      id: "platform-01",
      title: "Cybersecurity Analyst Internship",
      company: "SecureLink",
      description: "Detailed description with threat intelligence and log analysis.",
      location: "Remote",
      mode: "remote",
      stipend: parseStipend("₹15,000 /month"),
      duration: "3 Months",
      skills: ["Cybersecurity", "Python", "Linux", "SIEM"],
      experience: "Students",
      eligibility: "Engineering students",
      deadline: "2026-09-30",
      postedDate: "Recent",
      source: "Internshala", // Priority 3
      sourceUrl: "https://internshala.com",
      applicationUrl: "https://internshala.com/internship/1",
      organizationUrl: null,
      tags: ["security"],
      verified: true,
      discoveredAt: new Date().toISOString()
    }
  ];

  const dedupeRes = deduplicateInternships(duplicateItems);
  assert("Deduplicate identical company & title: unique=1", dedupeRes.unique.length === 1);
  assert("Duplicates removed count=1", dedupeRes.duplicatesRemoved === 1);
  assert("Preferred higher-authority source (Internshala over Indeed)", dedupeRes.unique[0].source === "Internshala");
  assert("Merged skills from all duplicate listings", dedupeRes.unique[0].skills.includes("SIEM"));

  // 4. Multi-Source Discovery Engine Integration
  console.log("\n[Group 4] Multi-Source Parallel Discovery Engine");
  const profile = await profileStorage.get();
  
  console.log("Searching: 'Find cybersecurity internships in India with stipend above ₹10,000'...");
  const discovery = await DiscoveryEngine.discover(
    "Find cybersecurity internships in India with stipend above ₹10,000",
    profile,
    true // Force refresh
  );

  assert("Discovery engine status is success", discovery.status === "success");
  assert("Total sources queried >= 8", discovery.sourceSummary.totalSources >= 8);
  assert("Results discovered > 0", discovery.results.length > 0);
  assert("Results are ranked with matchScore >= 40", discovery.results.every(r => (r.matchScore ?? 0) >= 40));
  assert("Top match contains matchReasons", (discovery.results[0].matchReasons?.length ?? 0) > 0);
  assert("Contains transparent multi-source message", discovery.message.includes("Scoutly searched"));

  console.log(`\n==================================================`);
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED`);
  console.log(`==================================================`);
}

runDiscoveryTestSuite();
