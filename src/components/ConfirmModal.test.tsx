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
});
