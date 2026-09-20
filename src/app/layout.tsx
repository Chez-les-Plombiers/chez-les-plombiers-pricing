import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Space_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

/**
 * Eurostile Extended — la police du logotype CHEZ LES PLOMBIERS.
 *
 * Réservée aux TITRES. Ces fichiers ne contiennent pas le signe € (vérifié :
 * 353 glyphes, tous les accents français, pas l'euro) ; les montants restent
 * donc en Space Mono, ce qui est de toute façon le bon partage — la police de
 * marque pour dire, la mono pour chiffrer.
 *
 * ⚠️ Eurostile est sous licence Linotype. Les fichiers viennent du studio qui
 * a fait l'identité, mais une licence d'usage WEB est distincte d'une licence
 * bureautique. À confirmer auprès d'Étienne avant une mise en ligne publique
 * durable.
 */
const eurostile = localFont({
  variable: "--font-eurostile",
  display: "swap",
  src: [
    { path: "../fonts/eurostile-extended.ttf", weight: "400", style: "normal" },
    { path: "../fonts/eurostile-extended-bold.ttf", weight: "700", style: "normal" },
  ],
});

/**
 * ⚠️ Le `noindex` global a été retiré le 19/09/2026 (décision Étienne).
 *
 * Il rendait invisibles les seules pages du site qui portent des prix — or
 * dans ce marché personne n'en publie, c'est la différenciation de CHEZ LES
 * PLOMBIERS. Les pages d'administration gardent chacune leur propre `robots`,
 * il n'y a donc rien à rouvrir par mégarde ici.
 *
 * `metadataBase` pointe sur le domaine principal, pas sur le déploiement :
 * les pages sont servies sous `www.chezlesplombiers.fr/tarifs`, et les URL
 * canoniques doivent le dire, sinon Google indexerait le sous-domaine.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://www.chezlesplombiers.fr"),
  title: "Tarifs et disponibilités — Chez Les Plombiers",
  description:
    "Les prix, affichés. Tarifs et disponibilités en temps réel des trois lieux de CHEZ LES PLOMBIERS — l'Atelier, la Boutique et l'Appartement — 39 rue des Bourdonnais, Paris 1er.",
  alternates: { canonical: "/tarifs" },
  openGraph: {
    title: "Tarifs et disponibilités — Chez Les Plombiers",
    description:
      "Trois lieux à la même adresse, à deux pas du Pont Neuf. Consultez les tarifs et les disponibilités, jour par jour.",
    url: "/tarifs",
    siteName: "Chez Les Plombiers",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-LHBRR8HRC3"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LHBRR8HRC3');
          `}
        </Script>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "vju7iukwc9");`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${spaceMono.variable} ${eurostile.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
