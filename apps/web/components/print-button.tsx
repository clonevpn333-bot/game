'use client';

import { Button } from '@binderready/design';
import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <Button
      variant="secondary"
      onClick={() => {
        window.print();
      }}
    >
      <Printer strokeWidth={1.5} />
      Print
    </Button>
  );
}
