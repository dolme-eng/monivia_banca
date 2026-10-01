import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from './ConfirmModal';

// Mock lucide-react to avoid SVG issues in jsdom
vi.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <span data-testid="icon-alert" {...props} />,
  X: (props: any) => <span data-testid="icon-x" {...props} />,
}));

const defaultProps = {
  open: true,
  title: 'Conferma Operazione',
  message: 'Sei sicuro di voler procedere?',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ConfirmModal', () => {
  it('renders nothing when closed', () => {
    render(<ConfirmModal {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Conferma Operazione')).toBeInTheDocument();
    expect(screen.getByText('Sei sicuro di voler procedere?')).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<ConfirmModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-modal-title');
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Annulla'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Conferma'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    // Click the backdrop (the first div with bg-black/40)
    const backdrop = document.querySelector('.bg-black\\/40');
    if (backdrop) fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not call onCancel on backdrop click when loading', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} loading={true} />);
    const backdrop = document.querySelector('.bg-black\\/40');
    if (backdrop) fireEvent.click(backdrop);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not call onCancel on Escape when loading', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} loading={true} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('shows custom labels', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmLabel="Approva"
        cancelLabel="Rifiuta"
      />
    );
    expect(screen.getByText('Approva')).toBeInTheDocument();
    expect(screen.getByText('Rifiuta')).toBeInTheDocument();
  });

  it('shows spinner when loading', () => {
    render(<ConfirmModal {...defaultProps} loading={true} />);
    const confirmBtn = screen.getByText('Conferma').closest('button');
    expect(confirmBtn?.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(<ConfirmModal {...defaultProps} loading={true} />);
    const confirmBtn = screen.getByText('Conferma').closest('button');
    const cancelBtn = screen.getByText('Annulla').closest('button');
    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
  });

  it('applies danger variant by default', () => {
    render(<ConfirmModal {...defaultProps} />);
    const confirmBtn = screen.getByText('Conferma').closest('button');
    expect(confirmBtn?.className).toContain('bg-red-600');
  });

  it('applies warning variant colors', () => {
    render(<ConfirmModal {...defaultProps} variant="warning" />);
    const confirmBtn = screen.getByText('Conferma').closest('button');
    expect(confirmBtn?.className).toContain('bg-amber-600');
  });

  it('applies info variant colors', () => {
    render(<ConfirmModal {...defaultProps} variant="info" />);
    const confirmBtn = screen.getByText('Conferma').closest('button');
    expect(confirmBtn?.className).toContain('bg-secondary');
  });

  // The regression that shipped: `useState` sat after `if (!open) return null`,
  // so the hook count went from 4 to 6 the moment the dialog opened and React
  // threw "Rendered more hooks than during the previous render". Every
  // confirmation flow in the app broke. Each test below mounts CLOSED and then
  // opens on the SAME instance — the transition the old suite never exercised.
  it('opens without a hook error when toggled on an already-mounted instance', () => {
    const { rerender } = render(<ConfirmModal {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    expect(() => rerender(<ConfirmModal {...defaultProps} open={true} />)).not.toThrow();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('survives repeated open/close cycles', () => {
    const { rerender } = render(<ConfirmModal {...defaultProps} open={false} />);
    for (let i = 0; i < 3; i++) {
      expect(() => rerender(<ConfirmModal {...defaultProps} open={true} />)).not.toThrow();
      expect(() => rerender(<ConfirmModal {...defaultProps} open={false} />)).not.toThrow();
    }
  });

  describe('requireTyped (destructive confirmation)', () => {
    it('blocks confirm until the value is typed', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          requireTyped="IT60X0542811101000000123456"
          expected="IT60X0542811101000000123456"
        />
      );
      const confirmBtn = screen.getByText('Conferma').closest('button');
      expect(confirmBtn).toBeDisabled();
    });

    it('enables confirm once the value matches, ignoring case and spaces', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          requireTyped="IT60X0542811101000000123456"
          expected="IT60X0542811101000000123456"
        />
      );
      fireEvent.change(screen.getByLabelText(/Digita/), {
        target: { value: 'it60 x0542 8111 0100 0000 123 456' },
      });
      const confirmBtn = screen.getByText('Conferma').closest('button');
      expect(confirmBtn).not.toBeDisabled();
    });

    it('does not pre-fill the field on reopen', () => {
      const { rerender } = render(
        <ConfirmModal
          {...defaultProps}
          requireTyped="IT60X0542811101000000123456"
          expected="IT60X0542811101000000123456"
        />
      );
      fireEvent.change(screen.getByLabelText(/Digita/), {
        target: { value: 'IT60X0542811101000000123456' },
      });
      expect(screen.getByText('Conferma').closest('button')).not.toBeDisabled();

      rerender(<ConfirmModal {...defaultProps} open={false} />);
      rerender(
        <ConfirmModal
          {...defaultProps}
          requireTyped="IT60X0542811101000000123456"
          expected="IT60X0542811101000000123456"
        />
      );
      // A stale value must never carry over to the next destructive action.
      expect(screen.getByText('Conferma').closest('button')).toBeDisabled();
    });
  });
});
