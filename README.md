This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



```json
//Properties-launchSettings.json
{
  "$schema": "http://json.schemastore.org/launchsettings.json",
  "iisSettings": {
    "windowsAuthentication": false,
    "anonymousAuthentication": true,
    "iisExpress": {
      "applicationUrl": "http://localhost:6930",
      "sslPort": 44351
    }
  },
  "profiles": {
    "Backend_GestionXcore": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "launchUrl": "swagger",
      "applicationUrl": "https://0.0.0.0:7147;http://0.0.0.0:5248",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development",
        "JWT_SECRET": "2f6G9sK8dL1pQ5vXyZ3nA4rT7uM0bHcE"
      }
    },
    "IIS Express": {
      "commandName": "IISExpress",
      "launchBrowser": true,
      "launchUrl": "swagger",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development",
        "JWT_SECRET": "2f6G9sK8dL1pQ5vXyZ3nA4rT7uM0bHcE"
      }
    }
  }
}


{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    //"DefaultConnection": "Server=161.132.223.34\\SERVERSQL2016,50200;User ID=SOPORTETI;Password=SOPORTETI;Database=X;Encrypt=False;TrustServerCertificate=True;",
    "DefaultConnection": "Server=161.132.223.34\\SERVERSQL2016,50200;User ID=SOPORTETI;Password=SOPORTETI;Database=TEST;Encrypt=False;TrustServerCertificate=True;",
    "SqlGestionXcoreDB": "Server=161.132.223.34\\SERVERSQL2016,50200;User ID=SOPORTETI;Password=SOPORTETI;Database=GestionXcoreDB;Encrypt=false;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Secret": "2f6G9sK8dL1pQ5vXyZ3nA4rT7uM0bHcE",
    "Issuer": "gestionXcore.API",
    "Audience": "gestionXcore.Clientes"
  }

}

```