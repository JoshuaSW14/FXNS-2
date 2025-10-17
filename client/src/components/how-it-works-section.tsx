export default function HowItWorksSection() {
  return (
    <section className="py-16 bg-white" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How it works</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Get started with fxns in three simple steps
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-primary-600">1</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Browse & Discover</h3>
            <p className="text-gray-600">
              Explore our collection of micro-tools organized by category. Find exactly what you need with our search and filtering options.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-violet-600">2</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Input & Run</h3>
            <p className="text-gray-600">
              Fill out the simple form with your data. Each tool has a clean, intuitive interface designed for speed and accuracy.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-emerald-600">3</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Results</h3>
            <p className="text-gray-600">
              Receive instant, accurate results you can copy, share, or use immediately. Save favorites for quick access later.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
