import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#111815] p-6 text-[#FAF6F0]">
          <div className="w-full max-w-md rounded-xl border border-[#C5A059]/40 bg-[#18221D] p-7 text-center shadow-2xl">
            <h1 className="font-serif text-2xl font-semibold text-[#C5A059]">
              সাময়িক কারিগরি ত্রুটি
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#FAF6F0]/80">
              দুঃখিত, এই মুহূর্তে তথ্য লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পেজটি রিলোড করুন।
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-md bg-[#C5A059] px-6 py-2.5 text-sm font-semibold text-[#111815] hover:bg-[#D4B26E] cursor-pointer"
            >
              পেজ রিলোড করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
