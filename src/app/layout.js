import { Roboto } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { AppProvider } from "@/components/AppContext";
import { Toaster } from "react-hot-toast";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata = {
  title: "Roll Burrito Hub | Store",
  description: "Burritos, tamaños y complementos para pedir en línea en Roll Burrito Hub.",
};

export default function RootLayout({ children }) {
  return (
    <html lang='es'>
      <body className={roboto.className}>
        <main className='max-w-4xl mx-auto p-4'>
          <AppProvider>
            <Toaster />
            <Header />
            {children}
            <footer className='border-t p-8 text-center mt-16'>
              &copy; 2025 All rights Reserved @juanitovenenoestudio
            </footer>
          </AppProvider>
        </main>
      </body>
    </html>
  );
}
