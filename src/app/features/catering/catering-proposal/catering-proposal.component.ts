import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CateringService } from '../../../services/catering.service';
import { CateringJob } from '../../../models/index';

@Component({
  selector: 'os-catering-proposal',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './catering-proposal.component.html',
  styleUrl: './catering-proposal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringProposalComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cateringService = inject(CateringService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly job = signal<CateringJob | null>(null);
  readonly isLoading = signal(true);
  readonly isApproving = signal(false);
  readonly approved = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedPackageId = signal<string | null>(null);
  readonly contractAcknowledged = signal(false);
  readonly approvedPackageName = signal('');
  readonly approvedTotalCents = signal(0);

  // E-signature
  readonly electronicConsentGiven = signal(false);
  readonly hasSignature = signal(false);

  private token = '';
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private consentTimestamp = '';

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.error.set('Invalid proposal link.');
      this.isLoading.set(false);
      return;
    }

    try {
      const result = await this.cateringService.getProposal(this.token);
      if (result) {
        this.job.set(result);
      } else {
        this.error.set('This proposal was not found or has expired.');
      }
    } catch {
      this.error.set('Unable to load the proposal. Please try again later.');
    } finally {
      this.isLoading.set(false);
    }
  }

  ngAfterViewInit(): void {
    this.initCanvas();
  }

  private initCanvas(): void {
    if (!this.canvasRef?.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  // ── Canvas event handlers ──

  onCanvasMouseDown(event: MouseEvent): void {
    this.isDrawing = true;
    const { x, y } = this.getCanvasCoords(event);
    this.ctx?.beginPath();
    this.ctx?.moveTo(x, y);
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (!this.isDrawing || !this.ctx) return;
    const { x, y } = this.getCanvasCoords(event);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    if (!this.hasSignature()) {
      this.hasSignature.set(true);
      this.cdr.markForCheck();
    }
  }

  onCanvasMouseUp(): void {
    this.isDrawing = false;
  }

  onCanvasTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    this.isDrawing = true;
    const { x, y } = this.getTouchCoords(touch);
    this.ctx?.beginPath();
    this.ctx?.moveTo(x, y);
  }

  onCanvasTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || !this.ctx) return;
    const touch = event.touches[0];
    const { x, y } = this.getTouchCoords(touch);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    if (!this.hasSignature()) {
      this.hasSignature.set(true);
      this.cdr.markForCheck();
    }
  }

  onCanvasTouchEnd(): void {
    this.isDrawing = false;
  }

  clearSignature(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.hasSignature.set(false);
  }

  private getCanvasCoords(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (this.canvasRef.nativeElement.width / rect.width),
      y: (event.clientY - rect.top) * (this.canvasRef.nativeElement.height / rect.height),
    };
  }

  private getTouchCoords(touch: Touch): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (this.canvasRef.nativeElement.width / rect.width),
      y: (touch.clientY - rect.top) * (this.canvasRef.nativeElement.height / rect.height),
    };
  }

  private getSignatureDataUrl(): string {
    return this.canvasRef?.nativeElement.toDataURL('image/png') ?? '';
  }

  // ── Proposal logic ──

  selectPackage(packageId: string): void {
    this.selectedPackageId.set(packageId);
  }

  toggleContractAcknowledged(): void {
    this.contractAcknowledged.set(!this.contractAcknowledged());
  }

  toggleConsent(): void {
    const giving = !this.electronicConsentGiven();
    this.electronicConsentGiven.set(giving);
    if (giving) {
      this.consentTimestamp = new Date().toISOString();
    } else {
      this.consentTimestamp = '';
    }
  }

  canApprove(): boolean {
    if (!this.selectedPackageId()) return false;
    const j = this.job();
    if (j?.contractUrl && !this.contractAcknowledged()) return false;
    if (!this.electronicConsentGiven()) return false;
    if (!this.hasSignature()) return false;
    return true;
  }

  async approvePackage(): Promise<void> {
    const packageId = this.selectedPackageId();
    if (!packageId || this.isApproving() || !this.canApprove()) return;

    this.isApproving.set(true);
    this.error.set(null);

    try {
      const signatureImage = this.getSignatureDataUrl();
      const result = await this.cateringService.approveProposal(
        this.token,
        packageId,
        signatureImage,
        this.consentTimestamp || new Date().toISOString(),
      );
      if (result?.success) {
        this.approved.set(true);
        this.approvedPackageName.set(result.packageName);
        this.approvedTotalCents.set(result.totalCents);
      } else {
        this.error.set('Unable to approve this proposal. It may have already been approved or expired.');
      }
    } catch {
      this.error.set('Something went wrong. Please try again.');
    } finally {
      this.isApproving.set(false);
    }
  }

  formatCents(cents: number): string {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  getPricingLabel(model: string): string {
    switch (model) {
      case 'per_person': return 'per person';
      case 'per_tray': return 'per tray';
      case 'flat': return 'flat rate';
      default: return model;
    }
  }

  getTierLabel(tier: string): string {
    switch (tier) {
      case 'standard': return 'Standard';
      case 'premium': return 'Premium';
      case 'custom': return 'Custom';
      default: return tier;
    }
  }
}
