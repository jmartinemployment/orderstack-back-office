import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BookingManager } from '../booking-manager';
import { BottomNavigation } from '@shared/bottom-navigation/bottom-navigation';

@Component({
  selector: 'os-bookings-terminal',
  imports: [BookingManager, BottomNavigation],
  templateUrl: './bookings-terminal.html',
  styleUrl: './bookings-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsTerminal {}
