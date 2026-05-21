export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-background border-t border-sidebar-border">
      <div className="container flex justify-between items-center p-4 md:px-6">
        <p className="text-xs text-muted-foreground md:text-sm">
          &copy; {currentYear} Pharmacy Retail Analytics.
        </p>
        <p className="text-xs text-muted-foreground md:text-sm">
          Built by{" "}
          <a
            href="https://github.com/albarpambagio/pharmacy-retail-sales-analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Albar — Data Analytics Portfolio
          </a>
        </p>
      </div>
    </footer>
  )
}
