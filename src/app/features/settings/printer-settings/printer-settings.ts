import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PrinterService } from '../../../services/printer';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../../shared/error-display/error-display';
import { Printer, PrinterModel, CloudPrntConfig } from '../../../models/index';

@Component({
  selector: 'os-printer-settings',
  imports: [FormsModule, DatePipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './printer-settings.html',
  styleUrl: './printer-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrinterSettings implements OnInit {
  private readonly printerService = inject(PrinterService);

  readonly printers = this.printerService.printers;
  readonly isLoading = this.printerService.isLoading;
  readonly error = this.printerService.error;

  // Add form
  private readonly _showAddForm = signal(false);
  private readonly _formName = signal('');
  private readonly _formModel = signal<PrinterModel>('Star mC-Print3');
  private readonly _formMacAddress = signal('');
  private readonly _formIpAddress = signal('');
  private readonly _formPrintWidth = signal(48);
  private readonly _formIsDefault = signal(false);
  private readonly _isSubmitting = signal(false);

  readonly showAddForm = this._showAddForm.asReadonly();
  readonly formName = this._formName.asReadonly();
  readonly formModel = this._formModel.asReadonly();
  readonly formMacAddress = this._formMacAddress.asReadonly();
  readonly formIpAddress = this._formIpAddress.asReadonly();
  readonly formPrintWidth = this._formPrintWidth.asReadonly();
  readonly formIsDefault = this._formIsDefault.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();

  // CloudPRNT display
  private readonly _cloudPrntConfig = signal<CloudPrntConfig | null>(null);
  private readonly _newlyCreatedPrinter = signal<Printer | null>(null);

  readonly cloudPrntConfig = this._cloudPrntConfig.asReadonly();
  readonly newlyCreatedPrinter = this._newlyCreatedPrinter.asReadonly();

  // Edit state
  private readonly _editingPrinter = signal<Printer | null>(null);
  private readonly _editName = signal('');
  private readonly _editModel = signal<PrinterModel>('Star mC-Print3');
  private readonly _editIpAddress = signal('');
  private readonly _editPrintWidth = signal(48);
  private readonly _editIsDefault = signal(false);

  readonly editingPrinter = this._editingPrinter.asReadonly();
  readonly editName = this._editName.asReadonly();
  readonly editModel = this._editModel.asReadonly();
  readonly editIpAddress = this._editIpAddress.asReadonly();
  readonly editPrintWidth = this._editPrintWidth.asReadonly();
  readonly editIsDefault = this._editIsDefault.asReadonly();

  // Delete / test
  private readonly _deletingPrinter = signal<Printer | null>(null);
  private readonly _testingPrinterId = signal<string | null>(null);
  private readonly _testResult = signal<string | null>(null);
  private readonly _copiedUrl = signal(false);
  private _lastTestedId = '';

  readonly deletingPrinter = this._deletingPrinter.asReadonly();
  readonly testingPrinterId = this._testingPrinterId.asReadonly();
  readonly testResult = this._testResult.asReadonly();
  readonly copiedUrl = this._copiedUrl.asReadonly();

  readonly printerModels: PrinterModel[] = [
    'Star mC-Print3',
    'Star mC-Print2',
    'Star TSP654II',
    'Star TSP743II',
  ];

  readonly macAddressValid = computed(() =>
    /^[\dA-Fa-f]{2}(:[\dA-Fa-f]{2}){5}$/.exec(this._formMacAddress()) !== null
  );

  readonly totalPrinters = computed(() => this.printers().length);
  readonly activePrinters = computed(() =>
    this.printers().filter(p => p.isActive).length
  );
  readonly defaultPrinter = computed(() =>
    this.printers().find(p => p.isDefault)
  );
  readonly onlinePrinters = computed(() =>
    this.printers().filter(p => this.isOnline(p)).length
  );

  ngOnInit(): void {
    this.printerService.loadPrinters();
  }

  isOnline(printer: Printer): boolean {
    if (!printer.lastPollAt) return false;
    return (Date.now() - new Date(printer.lastPollAt).getTime()) < 60_000;
  }

  getStatusText(printer: Printer): string {
    if (!printer.isActive) return 'Disabled';
    return this.isOnline(printer) ? 'Online' : 'Offline';
  }

  getStatusClass(printer: Printer): string {
    if (!printer.isActive) return 'status-disabled';
    return this.isOnline(printer) ? 'status-online' : 'status-offline';
  }

  formatMacAddress(value: string): string {
    const hex = value.replaceAll(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 12);
    const parts: string[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      parts.push(hex.slice(i, i + 2));
    }
    return parts.join(':');
  }

  onMacInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatMacAddress(input.value);
    this._formMacAddress.set(formatted);
    input.value = formatted;
  }

  copyCloudPrntUrl(): void {
    const config = this._cloudPrntConfig();
    if (!config) return;
    navigator.clipboard.writeText(config.serverUrl);
    this._copiedUrl.set(true);
    setTimeout(() => this._copiedUrl.set(false), 2000);
  }

  toggleAddForm(): void {
    const showing = !this._showAddForm();
    this._showAddForm.set(showing);
    if (showing) {
      this._formName.set('');
      this._formModel.set('Star mC-Print3');
      this._formMacAddress.set('');
      this._formIpAddress.set('');
      this._formPrintWidth.set(48);
      this._formIsDefault.set(false);
    }
  }

  async addPrinter(): Promise<void> {
    if (!this.macAddressValid() || !this._formName().trim()) return;
    this._isSubmitting.set(true);

    const response = await this.printerService.createPrinter({
      name: this._formName().trim(),
      model: this._formModel(),
      macAddress: this._formMacAddress(),
      ipAddress: this._formIpAddress().trim() || undefined,
      printWidth: this._formPrintWidth(),
      isDefault: this._formIsDefault(),
    });

    this._isSubmitting.set(false);

    if (response) {
      this._cloudPrntConfig.set(response.cloudPrntConfig);
      this._newlyCreatedPrinter.set(response.printer);
      this._showAddForm.set(false);
    }
  }

  startEdit(printer: Printer): void {
    this._editingPrinter.set(printer);
    this._editName.set(printer.name);
    this._editModel.set(printer.model);
    this._editIpAddress.set(printer.ipAddress ?? '');
    this._editPrintWidth.set(printer.printWidth);
    this._editIsDefault.set(printer.isDefault);
  }

  cancelEdit(): void {
    this._editingPrinter.set(null);
  }

  async saveEdit(): Promise<void> {
    const printer = this._editingPrinter();
    if (!printer) return;

    await this.printerService.updatePrinter(printer.id, {
      name: this._editName().trim(),
      model: this._editModel(),
      ipAddress: this._editIpAddress().trim() || null,
      printWidth: this._editPrintWidth(),
      isDefault: this._editIsDefault(),
    });

    this._editingPrinter.set(null);
  }

  async toggleActive(printer: Printer): Promise<void> {
    await this.printerService.updatePrinter(printer.id, {
      isActive: !printer.isActive,
    });
  }

  confirmDelete(printer: Printer): void {
    this._deletingPrinter.set(printer);
  }

  cancelDelete(): void {
    this._deletingPrinter.set(null);
  }

  async executeDelete(): Promise<void> {
    const printer = this._deletingPrinter();
    if (!printer) return;
    await this.printerService.deletePrinter(printer.id);
    this._deletingPrinter.set(null);
  }

  async testPrint(printerId: string): Promise<void> {
    this._testingPrinterId.set(printerId);
    this._testResult.set(null);
    this._lastTestedId = printerId;

    const result = await this.printerService.testPrint(printerId);

    this._testingPrinterId.set(null);
    this._testResult.set(
      result?.success ? 'Test print sent' : 'Test print failed'
    );

    setTimeout(() => this._testResult.set(null), 3000);
  }

  getLastTestedId(): string {
    return this._lastTestedId;
  }

  dismissConfig(): void {
    this._cloudPrntConfig.set(null);
    this._newlyCreatedPrinter.set(null);
  }

  onFormField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'name') {
      this._formName.set(value);
    } else if (field === 'ipAddress') {
      this._formIpAddress.set(value);
    }
  }

  onFormSelect(field: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (field === 'model') {
      this._formModel.set(value as PrinterModel);
    }
  }

  onFormNumber(field: string, event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    if (field === 'printWidth') {
      this._formPrintWidth.set(value || 48);
    }
  }

  onFormCheckbox(field: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (field === 'isDefault') {
      this._formIsDefault.set(checked);
    }
  }

  onEditField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'name') {
      this._editName.set(value);
    } else if (field === 'ipAddress') {
      this._editIpAddress.set(value);
    }
  }

  onEditSelect(field: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (field === 'model') {
      this._editModel.set(value as PrinterModel);
    }
  }

  onEditNumber(field: string, event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    if (field === 'printWidth') {
      this._editPrintWidth.set(value || 48);
    }
  }

  onEditCheckbox(field: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (field === 'isDefault') {
      this._editIsDefault.set(checked);
    }
  }

  retry(): void {
    this.printerService.loadPrinters();
  }
}
