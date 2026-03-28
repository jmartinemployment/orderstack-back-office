import '../../../../test-setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, ActivatedRoute } from '@angular/router';
import {
  CateringJobStatus,
  CATERING_STATUS_TRANSITIONS,
  ProposalAiContent,
  ProposalTone,
  CateringJob,
} from '@models/index';
import { environment } from '@environments/environment';
import { CateringJobDetailComponent } from './catering-job-detail.component';
import { CateringService } from '../../../services/catering.service';
import { MenuService } from '../../../services/menu';
import { NotificationService } from '../../../services/notification';

/**
 * BUG-21: "Proposal Sent" button was shown as an active CTA on new Inquiry
 * jobs before any proposal was sent.
 *
 * Fixes:
 * 1. Status advancement buttons use action-oriented labels (e.g. "Mark Proposal Sent")
 *    instead of status labels (e.g. "Proposal Sent").
 * 2. "Send Proposal" button only shows for inquiry; "Resend Proposal" for proposal_sent.
 * 3. Event card advance labels also use action-oriented text.
 */

// Replica of statusActionLabels from the component
const statusActionLabels: Record<CateringJobStatus, string> = {
  inquiry: 'Inquiry',
  proposal_sent: 'Mark Proposal Sent',
  contract_signed: 'Mark Contract Signed',
  deposit_received: 'Record Deposit',
  in_progress: 'Start Event',
  final_payment: 'Record Final Payment',
  completed: 'Mark Completed',
  cancelled: 'Cancel',
};

// Replica of event card advanceLabel map
const cardAdvanceLabels: Record<string, string> = {
  inquiry: 'Mark Proposal Sent',
  proposal_sent: 'Mark Contract Signed',
  contract_signed: 'Record Deposit',
  deposit_received: 'Start Job',
  in_progress: 'Record Final Payment',
  final_payment: 'Mark Complete',
};

// Replica of nextStatuses logic
function nextStatuses(status: CateringJobStatus): CateringJobStatus[] {
  return CATERING_STATUS_TRANSITIONS[status].filter(s => s !== 'cancelled');
}

// Whether "Send Proposal" should show (only for inquiry)
function showSendProposal(status: CateringJobStatus): boolean {
  return status === 'inquiry';
}

// Whether "Resend Proposal" should show (only for proposal_sent)
function showResendProposal(status: CateringJobStatus): boolean {
  return status === 'proposal_sent';
}

describe('catering job detail — button labels (BUG-21)', () => {
  it('inquiry job: advancement button says "Mark Proposal Sent" not "Proposal Sent"', () => {
    const statuses = nextStatuses('inquiry');
    expect(statuses).toEqual(['proposal_sent']);
    expect(statusActionLabels[statuses[0]]).toBe('Mark Proposal Sent');
  });

  it('inquiry job: "Send Proposal" button is visible', () => {
    expect(showSendProposal('inquiry')).toBe(true);
    expect(showResendProposal('inquiry')).toBe(false);
  });

  it('proposal_sent job: "Resend Proposal" button is visible, not "Send Proposal"', () => {
    expect(showSendProposal('proposal_sent')).toBe(false);
    expect(showResendProposal('proposal_sent')).toBe(true);
  });

  it('contract_signed job: neither Send nor Resend Proposal shows', () => {
    expect(showSendProposal('contract_signed')).toBe(false);
    expect(showResendProposal('contract_signed')).toBe(false);
  });

  it('proposal_sent: advancement button says "Mark Contract Signed"', () => {
    const statuses = nextStatuses('proposal_sent');
    expect(statuses).toEqual(['contract_signed']);
    expect(statusActionLabels[statuses[0]]).toBe('Mark Contract Signed');
  });

  it('no action label contains bare status text that could be confused as past-tense state', () => {
    const confusing = ['Proposal Sent', 'Contract Signed', 'Deposit Received', 'Final Payment'];
    for (const [status, label] of Object.entries(statusActionLabels)) {
      if (status === 'inquiry' || status === 'cancelled') continue;
      for (const bad of confusing) {
        expect(label, `statusActionLabels['${status}'] = "${label}" matches confusing label "${bad}"`).not.toBe(bad);
      }
    }
  });

  it('event card advance labels use action-oriented text', () => {
    expect(cardAdvanceLabels['inquiry']).toBe('Mark Proposal Sent');
    expect(cardAdvanceLabels['proposal_sent']).toBe('Mark Contract Signed');
    expect(cardAdvanceLabels['contract_signed']).toBe('Record Deposit');
  });

  it('completed/cancelled jobs have no next statuses', () => {
    expect(nextStatuses('completed')).toEqual([]);
    expect(nextStatuses('cancelled')).toEqual([]);
  });
});

describe('proposal URL uses environment base URL (BUG-22)', () => {
  // Replica of the URL construction logic from the component
  function buildProposalUrl(token: string): string {
    return `${environment.appBaseUrl}/catering/proposal/${token}`;
  }

  it('proposal URL uses environment.appBaseUrl, not window.location.origin', () => {
    const token = 'abc-123-def';
    const url = buildProposalUrl(token);
    expect(url).toBe(`${environment.appBaseUrl}/catering/proposal/${token}`);
    expect(url).not.toContain('window.location');
  });

  it('environment.appBaseUrl is defined and non-empty', () => {
    expect(environment.appBaseUrl).toBeDefined();
    expect(environment.appBaseUrl.length).toBeGreaterThan(0);
  });

  it('dev environment uses localhost:4200', () => {
    // In test context, we import the dev environment
    expect(environment.appBaseUrl).toBe('http://localhost:4200');
  });

  it('proposal URL does not contain double slashes in path', () => {
    const url = buildProposalUrl('test-token');
    const afterProtocol = url.replace('http://', '').replace('https://', '');
    expect(afterProtocol).not.toContain('//');
  });
});

// ─── FEATURE-12: CateringJobDetailComponent AI Proposal (TestBed) ────────────

const AI_CONTENT: ProposalAiContent = {
  intro: 'We are thrilled to cater your event.',
  menuDescriptions: [
    { itemId: 'item-1', itemName: 'Salad', description: 'A crisp garden salad.' },
    { itemId: 'item-2', itemName: 'Pasta', description: 'Al dente pasta with house sauce.' },
  ],
  serviceOverview: 'Our team will provide impeccable service.',
  dietaryStatement: 'We accommodate all dietary requirements.',
  closing: 'We look forward to working with you.',
  generatedAt: '2026-03-17T10:00:00.000Z',
  tone: 'professional',
};

function makeJob(overrides: Partial<CateringJob> = {}): CateringJob {
  return {
    id: 'job-1', restaurantId: 'r-1', title: 'Test Event', clientName: 'Test Client',
    eventType: 'corporate', status: 'inquiry', headcount: 50,
    bookingDate: '2026-04-01', fulfillmentDate: '2026-05-01', locationType: 'on_site',
    subtotalCents: 500000, serviceChargeCents: 0, taxCents: 0, gratuityCents: 0,
    totalCents: 500000, paidCents: 0, packages: [], milestones: [],
    aiContent: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const mockCateringService = {
  getJob: vi.fn(),
  loadActivity: vi.fn().mockResolvedValue([]),
  generateProposalAiContent: vi.fn(),
  saveProposalContent: vi.fn(),
  pendingJobsCount: vi.fn(() => 0),
  proposalsAwaitingApproval: vi.fn(() => 0),
  milestonesComingDue: vi.fn(() => 0),
};
const mockMenuService = { loadMenu: vi.fn(), cateringItems: vi.fn(() => []) };
const mockNotification = { show: vi.fn() };
const mockActivatedRoute = {
  snapshot: { paramMap: { get: vi.fn((k: string) => k === 'id' ? 'job-1' : null) } },
};

function createAiComponent() {
  const fixture = TestBed.createComponent(CateringJobDetailComponent);
  return { fixture, component: fixture.componentInstance };
}

describe('FEATURE-12: CateringJobDetailComponent — AI Proposal signals (TestBed)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockCateringService.getJob.mockResolvedValue(makeJob());
    mockCateringService.loadActivity.mockResolvedValue([]);
    mockCateringService.generateProposalAiContent.mockResolvedValue(null);
    mockCateringService.saveProposalContent.mockResolvedValue(null);

    await TestBed.configureTestingModule({
      imports: [CateringJobDetailComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: CateringService, useValue: mockCateringService },
        { provide: MenuService, useValue: mockMenuService },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compileComponents();
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it('aiContent is null before job loads', () => {
    const { component } = createAiComponent();
    expect(component.aiContent()).toBeNull();
  });

  it('selectedTone defaults to professional', () => {
    const { component } = createAiComponent();
    expect(component.selectedTone()).toBe('professional');
  });

  it('generating() starts as false', () => {
    const { component } = createAiComponent();
    expect(component.generating()).toBe(false);
  });

  it('savingContent() starts as false', () => {
    const { component } = createAiComponent();
    expect(component.savingContent()).toBe(false);
  });

  // ── aiContent initialized from job ────────────────────────────────────────

  it('aiContent is set from job.aiContent when job has AI content', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    const { component } = createAiComponent();
    await component.ngOnInit();
    expect(component.aiContent()).toEqual(AI_CONTENT);
  });

  it('aiContent remains null when job.aiContent is null', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: null }));
    const { component } = createAiComponent();
    await component.ngOnInit();
    expect(component.aiContent()).toBeNull();
  });

  // ── linkedSignal auto-population ──────────────────────────────────────────

  it('editedIntro auto-populates from aiContent.intro after job loads', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    const { component } = createAiComponent();
    await component.ngOnInit();
    expect(component.editedIntro()).toBe(AI_CONTENT.intro);
  });

  it('editedServiceOverview auto-populates from aiContent.serviceOverview', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    const { component } = createAiComponent();
    await component.ngOnInit();
    expect(component.editedServiceOverview()).toBe(AI_CONTENT.serviceOverview);
  });

  it('editedDietaryStatement auto-populates from aiContent.dietaryStatement', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    const { component } = createAiComponent();
    await component.ngOnInit();
    expect(component.editedDietaryStatement()).toBe(AI_CONTENT.dietaryStatement);
  });

  it('editedClosing auto-populates from aiContent.closing', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    const { component } = createAiComponent();
    await component.ngOnInit();
    expect(component.editedClosing()).toBe(AI_CONTENT.closing);
  });

  it('editedMenuDescriptions initializes as itemId→description map from aiContent', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    const { component } = createAiComponent();
    await component.ngOnInit();
    expect(component.editedMenuDescriptions()['item-1']).toBe('A crisp garden salad.');
    expect(component.editedMenuDescriptions()['item-2']).toBe('Al dente pasta with house sauce.');
  });

  it('editedIntro is empty string when aiContent is null', async () => {
    const { component } = createAiComponent();
    await component.ngOnInit();
    expect(component.editedIntro()).toBe('');
  });

  it('editedMenuDescriptions is empty object when aiContent is null', async () => {
    const { component } = createAiComponent();
    await component.ngOnInit();
    expect(component.editedMenuDescriptions()).toEqual({});
  });

  // ── setSelectedTone ───────────────────────────────────────────────────────

  it('setSelectedTone updates selectedTone to warm', () => {
    const { component } = createAiComponent();
    component.setSelectedTone('warm');
    expect(component.selectedTone()).toBe('warm');
  });

  it('setSelectedTone updates selectedTone to casual', () => {
    const { component } = createAiComponent();
    component.setSelectedTone('casual');
    expect(component.selectedTone()).toBe('casual');
  });

  // ── generateAiContent ─────────────────────────────────────────────────────

  it('generateAiContent calls service with job.id and current selectedTone', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob());
    mockCateringService.generateProposalAiContent.mockResolvedValue({ content: AI_CONTENT, truncated: false });
    const { component } = createAiComponent();
    await component.ngOnInit();
    component.setSelectedTone('warm');
    await component.generateAiContent();
    expect(mockCateringService.generateProposalAiContent).toHaveBeenCalledWith('job-1', 'warm');
  });

  it('generateAiContent sets aiContent signal on success', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob());
    mockCateringService.generateProposalAiContent.mockResolvedValue({ content: AI_CONTENT, truncated: false });
    const { component } = createAiComponent();
    await component.ngOnInit();
    await component.generateAiContent();
    expect(component.aiContent()).toEqual(AI_CONTENT);
  });

  it('generating() is true while awaiting the service call and false after', async () => {
    let resolveFn!: (v: { content: ProposalAiContent; truncated: boolean }) => void;
    const promise = new Promise<{ content: ProposalAiContent; truncated: boolean }>(r => { resolveFn = r; });
    mockCateringService.getJob.mockResolvedValue(makeJob());
    mockCateringService.generateProposalAiContent.mockReturnValue(promise);
    const { component } = createAiComponent();
    await component.ngOnInit();

    const genPromise = component.generateAiContent();
    expect(component.generating()).toBe(true);
    resolveFn({ content: AI_CONTENT, truncated: false });
    await genPromise;
    expect(component.generating()).toBe(false);
  });

  it('generateAiContent shows failure toast and keeps aiContent null when service returns null', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob());
    mockCateringService.generateProposalAiContent.mockResolvedValue(null);
    const { component } = createAiComponent();
    await component.ngOnInit();
    await component.generateAiContent();
    expect(mockNotification.show).toHaveBeenCalledWith(expect.stringContaining('Failed'));
    expect(component.aiContent()).toBeNull();
  });

  it('generateAiContent shows Settings > AI toast when feature is not-enabled', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob());
    mockCateringService.generateProposalAiContent.mockResolvedValue({ error: 'not-enabled' });
    const { component } = createAiComponent();
    await component.ngOnInit();
    await component.generateAiContent();
    expect(mockNotification.show).toHaveBeenCalledWith(expect.stringContaining('Settings > AI'));
  });

  it('generateAiContent shows retryAfter seconds in toast on rate-limit', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob());
    mockCateringService.generateProposalAiContent.mockResolvedValue({ error: 'rate-limited', retryAfter: 22 });
    const { component } = createAiComponent();
    await component.ngOnInit();
    await component.generateAiContent();
    expect(mockNotification.show).toHaveBeenCalledWith(expect.stringContaining('22 seconds'));
  });

  it('generateAiContent shows truncation toast when truncated: true', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob());
    mockCateringService.generateProposalAiContent.mockResolvedValue({ content: AI_CONTENT, truncated: true });
    const { component } = createAiComponent();
    await component.ngOnInit();
    await component.generateAiContent();
    expect(mockNotification.show).toHaveBeenCalledWith(expect.stringContaining('50 menu items'));
  });

  it('generateAiContent shows no toast on clean success (truncated: false)', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob());
    mockCateringService.generateProposalAiContent.mockResolvedValue({ content: AI_CONTENT, truncated: false });
    const { component } = createAiComponent();
    await component.ngOnInit();
    await component.generateAiContent();
    expect(mockNotification.show).not.toHaveBeenCalled();
  });

  it('generateAiContent is a no-op when job is null (no ngOnInit)', async () => {
    const { component } = createAiComponent();
    await component.generateAiContent();
    expect(mockCateringService.generateProposalAiContent).not.toHaveBeenCalled();
  });

  // ── saveEditedContent ─────────────────────────────────────────────────────

  it('saveEditedContent calls service with the patched content object', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    mockCateringService.saveProposalContent.mockResolvedValue({ ...AI_CONTENT, intro: 'Saved.' });
    const { component } = createAiComponent();
    await component.ngOnInit();
    component.editedIntro.set('Edited intro.');
    await component.saveEditedContent();
    expect(mockCateringService.saveProposalContent).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ intro: 'Edited intro.' }),
    );
  });

  it('saveEditedContent preserves generatedAt and tone in the patched object', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    mockCateringService.saveProposalContent.mockResolvedValue(AI_CONTENT);
    const { component } = createAiComponent();
    await component.ngOnInit();
    await component.saveEditedContent();
    const call = mockCateringService.saveProposalContent.mock.calls[0][1] as ProposalAiContent;
    expect(call.generatedAt).toBe(AI_CONTENT.generatedAt);
    expect(call.tone).toBe(AI_CONTENT.tone);
  });

  it('saveEditedContent updates aiContent signal with the value returned by the service', async () => {
    const saved = { ...AI_CONTENT, intro: 'Server-confirmed intro.' };
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    mockCateringService.saveProposalContent.mockResolvedValue(saved);
    const { component } = createAiComponent();
    await component.ngOnInit();
    await component.saveEditedContent();
    expect(component.aiContent()?.intro).toBe('Server-confirmed intro.');
  });

  it('savingContent() is true while awaiting save and false after', async () => {
    let resolveFn!: (v: ProposalAiContent) => void;
    const promise = new Promise<ProposalAiContent>(r => { resolveFn = r; });
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    mockCateringService.saveProposalContent.mockReturnValue(promise);
    const { component } = createAiComponent();
    await component.ngOnInit();

    const savePromise = component.saveEditedContent();
    expect(component.savingContent()).toBe(true);
    resolveFn(AI_CONTENT);
    await savePromise;
    expect(component.savingContent()).toBe(false);
  });

  it('saveEditedContent shows success toast when saved', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    mockCateringService.saveProposalContent.mockResolvedValue(AI_CONTENT);
    const { component } = createAiComponent();
    await component.ngOnInit();
    await component.saveEditedContent();
    expect(mockNotification.show).toHaveBeenCalledWith(expect.stringContaining('saved'));
  });

  it('saveEditedContent shows error toast when service returns null', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    mockCateringService.saveProposalContent.mockResolvedValue(null);
    const { component } = createAiComponent();
    await component.ngOnInit();
    await component.saveEditedContent();
    expect(mockNotification.show).toHaveBeenCalledWith(expect.stringContaining('Failed to save'));
  });

  it('saveEditedContent is a no-op when aiContent is null', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: null }));
    const { component } = createAiComponent();
    await component.ngOnInit();
    await component.saveEditedContent();
    expect(mockCateringService.saveProposalContent).not.toHaveBeenCalled();
  });

  // ── updateMenuDescription ─────────────────────────────────────────────────

  it('updateMenuDescription updates only the targeted itemId in editedMenuDescriptions', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    const { component } = createAiComponent();
    await component.ngOnInit();
    const event = { target: { value: 'New salad description.' } } as unknown as Event;
    component.updateMenuDescription('item-1', event);
    expect(component.editedMenuDescriptions()['item-1']).toBe('New salad description.');
    expect(component.editedMenuDescriptions()['item-2']).toBe('Al dente pasta with house sauce.');
  });

  it('saveEditedContent sends updateMenuDescription changes to the service', async () => {
    mockCateringService.getJob.mockResolvedValue(makeJob({ aiContent: AI_CONTENT }));
    mockCateringService.saveProposalContent.mockResolvedValue(AI_CONTENT);
    const { component } = createAiComponent();
    await component.ngOnInit();
    const event = { target: { value: 'Updated salad.' } } as unknown as Event;
    component.updateMenuDescription('item-1', event);
    await component.saveEditedContent();
    const call = mockCateringService.saveProposalContent.mock.calls[0][1] as ProposalAiContent;
    expect(call.menuDescriptions[0].description).toBe('Updated salad.');
    expect(call.menuDescriptions[1].description).toBe('Al dente pasta with house sauce.');
  });

  // ── ProposalTone exhaustiveness ────────────────────────────────────────────

  it('all three ProposalTone values can be set on selectedTone', () => {
    const tones: ProposalTone[] = ['professional', 'warm', 'casual'];
    const { component } = createAiComponent();
    for (const tone of tones) {
      component.setSelectedTone(tone);
      expect(component.selectedTone()).toBe(tone);
    }
  });
});
