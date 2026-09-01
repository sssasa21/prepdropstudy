interface ConfigErrorProps {
  missing: string[];
}

export const ConfigError = ({ missing }: ConfigErrorProps) => (
  <div className="min-h-screen flex items-center justify-center bg-background px-4">
    <div className="max-w-lg w-full rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg">
      <h1 className="text-xl font-bold mb-2">Configuration required</h1>
      <p className="text-sm text-muted-foreground mb-4">
        PrepDrop can&apos;t start because some environment variables are missing from this
        deployment. Add them in your hosting provider&apos;s project settings (Vercel:
        Settings → Environment Variables), then redeploy.
      </p>
      <ul className="space-y-1 mb-4">
        {missing.map((k) => (
          <li key={k} className="font-mono text-sm text-destructive">
            {k}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Frontend variables must start with <span className="font-mono">VITE_</span> or the
        browser bundle cannot read them.
      </p>
    </div>
  </div>
);
