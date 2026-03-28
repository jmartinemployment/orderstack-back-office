import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  input,
  output,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../services/report';
import {
  ReportBlock,
  ReportBlockType,
  SavedReport,
  SavedReportFormData,
  ComparisonPeriod,
} from '../../../models/index';

@Component({
  selector: 'os-report-builder',
  imports: [FormsModule],
  templateUrl: './report-builder.html',
  styleUrl: './report-builder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportBuilder implements OnInit {
  private readonly reportService = inject(ReportService);

  readonly editingReport = input<SavedReport | null>(null);
  readonly saved = output<SavedReport>();
  readonly cancelled = output<void>();

  readonly availableBlocks = this.reportService.availableBlocks;
  readonly error = this.reportService.error;

  private readonly _reportName = signal('');
  private readonly _selectedBlocks = signal<ReportBlock[]>([]);
  private readonly _startDate = signal('');
  private readonly _endDate = signal('');
  private readonly _comparisonPeriod = signal<ComparisonPeriod | ''>('');
  private readonly _comparisonStartDate = signal('');
  private readonly _comparisonEndDate = signal('');
  private readonly _isSaving = signal(false);

  readonly reportName = this._reportName.asReadonly();
  readonly selectedBlocks = this._selectedBlocks.asReadonly();
  readonly startDate = this._startDate.asReadonly();
  readonly endDate = this._endDate.asReadonly();
  readonly comparisonPeriod = this._comparisonPeriod.asReadonly();
  readonly comparisonStartDate = this._comparisonStartDate.asReadonly();
  readonly comparisonEndDate = this._comparisonEndDate.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();

  readonly unselectedBlocks = computed(() => {
    const selected = new Set(this._selectedBlocks().map(b => b.type));
    return this.availableBlocks().filter(b => !selected.has(b.type));
  });

  readonly canSave = computed(() =>
    this._reportName().trim().length > 0 && this._selectedBlocks().length > 0
  );

  readonly canRun = computed(() =>
    this._selectedBlocks().length > 0 &&
    this._startDate().length > 0 &&
    this._endDate().length > 0
  );

  readonly isEditing = computed(() => this.editingReport() !== null);

  constructor() {
    const today = new Date();
    this._startDate.set(this.formatDate(today));
    this._endDate.set(this.formatDate(today));
  }

  ngOnInit(): void {
    const report = this.editingReport();
    if (report) {
      this._reportName.set(report.name);
      this._selectedBlocks.set([...report.blocks]);
    }
  }

  setReportName(name: string): void {
    this._reportName.set(name);
  }

  setStartDate(date: string): void {
    this._startDate.set(date);
  }

  setEndDate(date: string): void {
    this._endDate.set(date);
  }

  setComparisonPeriod(period: string): void {
    this._comparisonPeriod.set(period as ComparisonPeriod | '');
  }

  setComparisonStartDate(date: string): void {
    this._comparisonStartDate.set(date);
  }

  setComparisonEndDate(date: string): void {
    this._comparisonEndDate.set(date);
  }

  addBlock(block: ReportBlock): void {
    this._selectedBlocks.update(list => [
      ...list,
      { ...block, displayOrder: list.length + 1 },
    ]);
  }

  removeBlock(index: number): void {
    this._selectedBlocks.update(list => {
      const updated = list.filter((_, i) => i !== index);
      return updated.map((b, i) => ({ ...b, displayOrder: i + 1 }));
    });
  }

  moveBlock(index: number, direction: 'up' | 'down'): void {
    this._selectedBlocks.update(list => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= list.length) return list;
      const updated = [...list];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated.map((b, i) => ({ ...b, displayOrder: i + 1 }));
    });
  }

  getBlockIcon(type: ReportBlockType): string {
    switch (type) {
      case 'sales_summary': return 'bi-cash-stack';
      case 'payment_methods': return 'bi-credit-card';
      case 'item_sales': return 'bi-cart3';
      case 'category_sales': return 'bi-grid-3x3-gap';
      case 'modifier_sales': return 'bi-plus-circle';
      case 'team_member_sales': return 'bi-people';
      case 'discounts': return 'bi-percent';
      case 'voids_comps': return 'bi-x-circle';
      case 'taxes_fees': return 'bi-receipt';
      case 'tips': return 'bi-heart';
      case 'hourly_breakdown': return 'bi-clock';
      case 'section_sales': return 'bi-layout-split';
      case 'channel_breakdown': return 'bi-diagram-3';
      case 'refunds': return 'bi-arrow-return-left';
      default: return 'bi-file-earmark-bar-graph';
    }
  }

  async saveReport(): Promise<void> {
    if (!this.canSave()) return;
    this._isSaving.set(true);

    const data: SavedReportFormData = {
      name: this._reportName().trim(),
      blocks: this._selectedBlocks(),
    };

    try {
      const editing = this.editingReport();
      if (editing) {
        await this.reportService.updateSavedReport(editing.id, data);
        this.saved.emit({ ...editing, ...data, updatedAt: new Date().toISOString() });
      } else {
        const report = await this.reportService.createSavedReport(data);
        if (report) {
          this.saved.emit(report);
        }
      }
    } finally {
      this._isSaving.set(false);
    }
  }

  async runReport(): Promise<void> {
    if (!this.canRun()) return;

    const editing = this.editingReport();
    let reportId = editing?.id;

    if (!reportId) {
      const report = await this.reportService.createSavedReport({
        name: this._reportName().trim() || 'Untitled Report',
        blocks: this._selectedBlocks(),
      });
      if (!report) return;
      reportId = report.id;
    }

    // const comparison = this._comparisonPeriod();
    // await this.reportService.runReport(this.reportId, {
    //   startDate: this._startDate(),
    //   endDate: this._endDate(),
    //   comparisonPeriod: comparison || undefined,
    //   comparisonStartDate: comparison === 'custom' ? this._comparisonStartDate() : undefined,
    //   comparisonEndDate: comparison === 'custom' ? this._comparisonEndDate() : undefined,
    // });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
