import { InternshipSourceAdapter } from "./source-adapter.js";
import { InternshalaAdapter } from "./sources/internshala.js";
import { UnstopAdapter } from "./sources/unstop.js";
import { WellfoundAdapter } from "./sources/wellfound.js";
import { AicteAdapter } from "./sources/aicte.js";
import { IndeedAdapter } from "./sources/indeed.js";
import { FounditAdapter } from "./sources/foundit.js";
import { NaukriAdapter } from "./sources/naukri.js";
import { LinkedInAdapter } from "./sources/linkedin.js";
import { GreenhouseAdapter } from "./sources/greenhouse.js";
import { LeverAdapter } from "./sources/lever.js";
import { CompanyCareersAdapter } from "./sources/company-careers.js";

export class SourceRegistry {
  private static adapters: InternshipSourceAdapter[] = [
    new InternshalaAdapter(),
    new UnstopAdapter(),
    new WellfoundAdapter(),
    new AicteAdapter(),
    new IndeedAdapter(),
    new FounditAdapter(),
    new NaukriAdapter(),
    new LinkedInAdapter(),
    new GreenhouseAdapter(),
    new LeverAdapter(),
    new CompanyCareersAdapter()
  ];

  public static getAllAdapters(): InternshipSourceAdapter[] {
    return [...this.adapters].sort((a, b) => a.priority - b.priority);
  }

  public static getEnabledAdapters(): InternshipSourceAdapter[] {
    return this.adapters.filter(a => a.enabled).sort((a, b) => a.priority - b.priority);
  }

  public static getAdapterById(id: string): InternshipSourceAdapter | undefined {
    return this.adapters.find(a => a.id === id);
  }

  public static setAdapterEnabled(id: string, enabled: boolean): boolean {
    const adapter = this.getAdapterById(id);
    if (adapter) {
      adapter.enabled = enabled;
      return true;
    }
    return false;
  }
}
