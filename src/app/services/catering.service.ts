import { Injectable, inject, signal, computed, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CateringJob,
  CateringJobStatus,
  CateringCapacitySettings,
  CateringActivity,
  CateringClientHistory,
  CateringDeferredRevenueEntry,
  CateringPerformanceReport,
  CateringPrepList,
  CateringPackageTemplate,
  CATERING_STATUS_TRANSITIONS,
  ProposalAiContent,
  ProposalTone,
} from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class CateringService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId() ?? null;
  }

  constructor() {
    effect(() => {
      const mid = this.authService.selectedMerchantId();
      if (mid) {
        untracked(() => {
          this.loadJobs();
          this.loadCapacitySettings();
        });
      }
    });
  }

  private readonly _jobs = signal<CateringJob[]>([]);
  private readonly _capacitySettings = signal<CateringCapacitySettings | null>(null);
  private readonly _packageTemplates = signal<CateringPackageTemplate[]>([]);
  readonly isLoading = signal(false);

  readonly jobs = this._jobs.asReadonly();
  readonly capacitySettings = this._capacitySettings.asReadonly();
  readonly packageTemplates = this._packageTemplates.asReadonly();

  // Backward compat alias
  readonly events = this._jobs.asReadonly();

  // --- Pipeline computed signals ---

  readonly activeJobs = computed(() => {
    const _d = new Date();
    const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
    return this._jobs()
      .filter(j => j.status !== 'completed' && j.status !== 'cancelled' && j.fulfillmentDate <= today)
      .sort((a, b) => a.fulfillmentDate.localeCompare(b.fulfillmentDate));
  });

  readonly upcomingJobs = computed(() => {
    const _d = new Date();
    const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
    return this._jobs()
      .filter(j => j.status !== 'completed' && j.status !== 'cancelled' && j.fulfillmentDate > today)
      .sort((a, b) => a.fulfillmentDate.localeCompare(b.fulfillmentDate));
  });

  readonly pastJobs = computed(() =>
    this._jobs()
      .filter(j => j.status === 'completed' || j.status === 'cancelled')
      .sort((a, b) => b.fulfillmentDate.localeCompare(a.fulfillmentDate))
  );

  // Backward compat aliases
  readonly activeEvents = this.activeJobs;
  readonly upcomingEvents = this.upcomingJobs;
  readonly pastEvents = this.pastJobs;

  readonly conflictDays = computed(() => {
    const settings = this._capacitySettings();
    if (!settings) return [];
    const confirmed = this._jobs().filter(j =>
      j.status !== 'cancelled' && j.status !== 'completed' && j.status !== 'inquiry'
    );
    const byDate: Record<string, number> = {};
    for (const j of confirmed) {
      byDate[j.fulfillmentDate] = (byDate[j.fulfillmentDate] ?? 0) + j.headcount;
    }
    return Object.entries(byDate)
      .filter(([, total]) => total > settings.maxHeadcountPerDay)
      .map(([date]) => date);
  });

  // --- Pipeline Metrics ---

  readonly totalPipeline = computed(() =>
    this.activeJobs().reduce((sum, j) => sum + j.totalCents, 0)
  );

  readonly outstandingBalance = computed(() =>
    this.activeJobs().reduce((sum, j) => sum + (j.totalCents - j.paidCents), 0)
  );

  readonly eventsThisMonth = computed(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return this._jobs().filter(j => {
      const [y, m] = j.fulfillmentDate.split('-').map(Number);
      return y === year && (m - 1) === month && j.status !== 'cancelled';
    }).length;
  });

  readonly avgJobValue = computed(() => {
    const active = this.activeJobs();
    if (active.length === 0) return 0;
    return Math.round(active.reduce((sum, j) => sum + j.totalCents, 0) / active.length);
  });

  readonly nextUpcomingJob = computed(() => {
    const _d = new Date();
    const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
    return this._jobs().find(j =>
      j.fulfillmentDate >= today
      && j.status !== 'cancelled'
      && j.status !== 'completed'
    ) ?? null;
  });

  // Sidebar badge counts
  readonly pendingJobsCount = computed(() =>
    this._jobs().filter(j => j.status === 'inquiry' || j.status === 'proposal_sent').length
  );

  readonly proposalsAwaitingApproval = computed(() =>
    this._jobs().filter(j => j.status === 'proposal_sent').length
  );

  readonly milestonesComingDue = computed(() => {
    const today = new Date();
    const threeDaysOut = new Date(today);
    threeDaysOut.setDate(today.getDate() + 3);
    const todayStr = today.toISOString().split('T')[0];
    const thresholdStr = threeDaysOut.toISOString().split('T')[0];

    let count = 0;
    for (const j of this.activeJobs()) {
      for (const m of j.milestones) {
        if (!m.paidAt && m.dueDate && m.dueDate >= todayStr && m.dueDate <= thresholdStr) {
          count++;
        }
      }
    }
    return count;
  });

  // --- API Methods ---

  async loadJobs(): Promise<void> {
    const id = this.merchantId;
    if (!id) return;

    this.isLoading.set(true);
    try {
      const jobs = await firstValueFrom(
        this.http.get<CateringJob[]>(
          `${this.apiUrl}/merchant/${id}/catering/events`
        )
      );
      this._jobs.set(jobs);
    } catch {
      this._jobs.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Backward compat alias
  async loadEvents(): Promise<void> {
    return this.loadJobs();
  }

  async loadCapacitySettings(): Promise<void> {
    const id = this.merchantId;
    if (!id) return;

    try {
      const settings = await firstValueFrom(
        this.http.get<CateringCapacitySettings>(
          `${this.apiUrl}/merchant/${id}/catering/capacity`
        )
      );
      this._capacitySettings.set(settings);
    } catch {
      this._capacitySettings.set(null);
    }
  }

  async getJob(jobId: string): Promise<CateringJob | null> {
    const id = this.merchantId;
    if (!id) return null;

    try {
      return await firstValueFrom(
        this.http.get<CateringJob>(
          `${this.apiUrl}/merchant/${id}/catering/events/${jobId}`
        )
      );
    } catch {
      return null;
    }
  }

  async createJob(
    data: Omit<CateringJob, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CateringJob | null> {
    const id = this.merchantId;
    if (!id) return null;

    try {
      const job = await firstValueFrom(
        this.http.post<CateringJob>(
          `${this.apiUrl}/merchant/${id}/catering/events`,
          data
        )
      );
      this._jobs.update(list => [...list, job]);
      return job;
    } catch {
      return null;
    }
  }

  // Backward compat alias
  async createEvent(data: Omit<CateringJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<CateringJob | null> {
    return this.createJob(data);
  }

  async updateJob(id: string, data: Partial<CateringJob>): Promise<CateringJob | null> {
    const mid = this.merchantId;
    if (!mid) return null;

    try {
      const updated = await firstValueFrom(
        this.http.patch<CateringJob>(
          `${this.apiUrl}/merchant/${mid}/catering/events/${id}`,
          data
        )
      );
      this._jobs.update(list =>
        list.map(j => j.id === id ? updated : j)
      );
      return updated;
    } catch {
      return null;
    }
  }

  // Backward compat alias
  async updateEvent(id: string, data: Partial<CateringJob>): Promise<void> {
    await this.updateJob(id, data);
  }

  async updateStatus(id: string, status: CateringJobStatus): Promise<void> {
    await this.updateJob(id, { status });
  }

  canTransitionTo(currentStatus: CateringJobStatus, targetStatus: CateringJobStatus): boolean {
    return CATERING_STATUS_TRANSITIONS[currentStatus].includes(targetStatus);
  }

  async deleteJob(id: string): Promise<void> {
    const mid = this.merchantId;
    if (!mid) return;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${mid}/catering/events/${id}`
        )
      );
      this._jobs.update(list => list.filter(j => j.id !== id));
    } catch {
      // silently fail
    }
  }

  // Backward compat alias
  async deleteEvent(id: string): Promise<void> {
    return this.deleteJob(id);
  }

  async markMilestonePaid(jobId: string, milestoneId: string): Promise<CateringJob | null> {
    const mid = this.merchantId;
    if (!mid) return null;

    try {
      const updated = await firstValueFrom(
        this.http.patch<CateringJob>(
          `${this.apiUrl}/merchant/${mid}/catering/events/${jobId}/milestones/${milestoneId}/pay`,
          {}
        )
      );
      this._jobs.update(list =>
        list.map(j => j.id === jobId ? updated : j)
      );
      return updated;
    } catch {
      return null;
    }
  }

  async cloneJob(jobId: string): Promise<CateringJob | null> {
    const mid = this.merchantId;
    if (!mid) return null;

    try {
      const clone = await firstValueFrom(
        this.http.post<CateringJob>(
          `${this.apiUrl}/merchant/${mid}/catering/events/${jobId}/clone`,
          {}
        )
      );
      this._jobs.update(list => [...list, clone]);
      return clone;
    } catch {
      return null;
    }
  }

  async generateProposal(jobId: string): Promise<{ token: string; url: string; expiresAt: string } | null> {
    const mid = this.merchantId;
    if (!mid) return null;

    try {
      return await firstValueFrom(
        this.http.post<{ token: string; url: string; expiresAt: string }>(
          `${this.apiUrl}/merchant/${mid}/catering/events/${jobId}/proposal`,
          {}
        )
      );
    } catch {
      return null;
    }
  }

  async uploadContract(jobId: string, contractUrl: string): Promise<CateringJob | null> {
    const mid = this.merchantId;
    if (!mid) return null;

    try {
      const updated = await firstValueFrom(
        this.http.post<CateringJob>(
          `${this.apiUrl}/merchant/${mid}/catering/events/${jobId}/contract`,
          { contractUrl }
        )
      );
      this._jobs.update(list =>
        list.map(j => j.id === jobId ? updated : j)
      );
      return updated;
    } catch {
      return null;
    }
  }

  async loadActivity(jobId: string): Promise<CateringActivity[]> {
    const mid = this.merchantId;
    if (!mid) return [];

    try {
      return await firstValueFrom(
        this.http.get<CateringActivity[]>(
          `${this.apiUrl}/merchant/${mid}/catering/events/${jobId}/activity`
        )
      );
    } catch {
      return [];
    }
  }

  async loadClients(): Promise<CateringClientHistory[]> {
    const mid = this.merchantId;
    if (!mid) return [];

    try {
      return await firstValueFrom(
        this.http.get<CateringClientHistory[]>(
          `${this.apiUrl}/merchant/${mid}/catering/clients`
        )
      );
    } catch {
      return [];
    }
  }

  async loadPrepList(date: string): Promise<CateringPrepList | null> {
    const mid = this.merchantId;
    if (!mid) return null;

    try {
      return await firstValueFrom(
        this.http.get<CateringPrepList>(
          `${this.apiUrl}/merchant/${mid}/catering/prep-list`,
          { params: { date } }
        )
      );
    } catch {
      return null;
    }
  }

  async loadDeferredRevenue(): Promise<CateringDeferredRevenueEntry[]> {
    const mid = this.merchantId;
    if (!mid) return [];

    try {
      return await firstValueFrom(
        this.http.get<CateringDeferredRevenueEntry[]>(
          `${this.apiUrl}/merchant/${mid}/reports/catering/deferred`
        )
      );
    } catch {
      return [];
    }
  }

  async loadPerformanceReport(): Promise<CateringPerformanceReport | null> {
    const mid = this.merchantId;
    if (!mid) return null;

    try {
      return await firstValueFrom(
        this.http.get<CateringPerformanceReport>(
          `${this.apiUrl}/merchant/${mid}/reports/catering/performance`
        )
      );
    } catch {
      return null;
    }
  }

  async bulkUpdateStatus(jobIds: string[], status: CateringJobStatus): Promise<void> {
    for (const id of jobIds) {
      await this.updateStatus(id, status);
    }
  }

  async saveCapacitySettings(settings: CateringCapacitySettings): Promise<void> {
    const id = this.merchantId;
    if (!id) return;

    try {
      const saved = await firstValueFrom(
        this.http.put<CateringCapacitySettings>(
          `${this.apiUrl}/merchant/${id}/catering/capacity`,
          settings
        )
      );
      this._capacitySettings.set(saved);
    } catch {
      // silently fail
    }
  }

  // Public API (no auth needed)
  async getProposal(token: string): Promise<CateringJob | null> {
    try {
      return await firstValueFrom(
        this.http.get<CateringJob>(
          `${this.apiUrl}/catering/proposal/${token}`
        )
      );
    } catch {
      return null;
    }
  }

  async approveProposal(
    token: string,
    packageId: string,
    signatureImage: string,
    consentedAt: string,
  ): Promise<{ success: boolean; packageName: string; totalCents: number } | null> {
    try {
      return await firstValueFrom(
        this.http.post<{ success: boolean; packageName: string; totalCents: number }>(
          `${this.apiUrl}/catering/proposal/${token}/approve`,
          { packageId, signatureImage, consentedAt }
        )
      );
    } catch {
      return null;
    }
  }

  async getPortal(token: string): Promise<CateringJob | null> {
    try {
      return await firstValueFrom(
        this.http.get<CateringJob>(
          `${this.apiUrl}/catering/portal/${token}`
        )
      );
    } catch {
      return null;
    }
  }

  async submitLead(merchantSlug: string, data: {
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    companyName?: string;
    eventType?: string;
    estimatedDate?: string;
    estimatedHeadcount?: number;
    message?: string;
  }): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/catering/lead/${merchantSlug}`,
          data
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  // --- Package Templates ---

  async loadPackageTemplates(): Promise<void> {
    const id = this.merchantId;
    if (!id) return;

    try {
      const templates = await firstValueFrom(
        this.http.get<CateringPackageTemplate[]>(
          `${this.apiUrl}/merchant/${id}/catering/packages`
        )
      );
      this._packageTemplates.set(templates);
    } catch {
      this._packageTemplates.set([]);
    }
  }

  async createPackageTemplate(
    data: Omit<CateringPackageTemplate, 'id' | 'merchantId' | 'isActive' | 'createdAt' | 'updatedAt'>
  ): Promise<CateringPackageTemplate | null> {
    const id = this.merchantId;
    if (!id) return null;

    try {
      const template = await firstValueFrom(
        this.http.post<CateringPackageTemplate>(
          `${this.apiUrl}/merchant/${id}/catering/packages`,
          data
        )
      );
      this._packageTemplates.update(list => [template, ...list]);
      return template;
    } catch {
      return null;
    }
  }

  async updatePackageTemplate(
    templateId: string,
    data: Partial<CateringPackageTemplate>
  ): Promise<CateringPackageTemplate | null> {
    const id = this.merchantId;
    if (!id) return null;

    try {
      const updated = await firstValueFrom(
        this.http.patch<CateringPackageTemplate>(
          `${this.apiUrl}/merchant/${id}/catering/packages/${templateId}`,
          data
        )
      );
      this._packageTemplates.update(list =>
        list.map(t => t.id === templateId ? updated : t)
      );
      return updated;
    } catch {
      return null;
    }
  }

  async deletePackageTemplate(templateId: string): Promise<void> {
    const id = this.merchantId;
    if (!id) return;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${id}/catering/packages/${templateId}`
        )
      );
      this._packageTemplates.update(list => list.filter(t => t.id !== templateId));
    } catch {
      // silently fail
    }
  }

  async generateProposalAiContent(
    jobId: string,
    tone: ProposalTone,
  ): Promise<
    | { content: ProposalAiContent; truncated: boolean }
    | { error: 'rate-limited'; retryAfter: number }
    | { error: 'not-enabled' }
    | null
  > {
    const mid = this.merchantId;
    if (!mid) return null;

    try {
      const content = await firstValueFrom(
        this.http.post<ProposalAiContent & { truncated: boolean }>(
          `${this.apiUrl}/merchant/${mid}/catering/events/${jobId}/proposal/generate`,
          { tone },
          { observe: 'response' }
        )
      );
      const body = content.body;
      if (!body) return null;
      return { content: body, truncated: body.truncated ?? false };
    } catch (err: unknown) {
      if (err instanceof Object && 'status' in err) {
        const httpErr = err as { status: number; headers?: { get?: (h: string) => string | null } };
        if (httpErr.status === 429) {
          const retryAfter = Number.parseInt(httpErr.headers?.get?.('retry-after') ?? '30', 10);
          return { error: 'rate-limited', retryAfter };
        }
        if (httpErr.status === 403) {
          return { error: 'not-enabled' };
        }
      }
      return null;
    }
  }

  async saveProposalContent(jobId: string, content: ProposalAiContent): Promise<ProposalAiContent | null> {
    const mid = this.merchantId;
    if (!mid) return null;

    try {
      return await firstValueFrom(
        this.http.patch<ProposalAiContent>(
          `${this.apiUrl}/merchant/${mid}/catering/events/${jobId}/proposal/content`,
          content
        )
      );
    } catch {
      return null;
    }
  }
}
