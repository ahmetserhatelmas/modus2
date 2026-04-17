import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "./ui";

export default async function GirisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/ogrenciler");

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-10 text-center">
        <p className="text-sm font-medium text-neutral-500">ERD-SİS</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
          Giriş
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          E-posta ve şifre ile oturum açın. Hesabınız yoksa kayıt olun.
        </p>
      </div>
      <LoginForm />
      <p className="mt-8 text-center text-xs text-neutral-500">
        Kişisel sağlık verileri KVKK kapsamındadır. Üretim ortamında hukuki
        metinler ve veri işleme sözleşmeleri eklenmelidir.
      </p>
      <p className="mt-4 text-center text-sm">
        <Link href="/" className="text-blue-600 hover:underline">
          Ana sayfa
        </Link>
      </p>
    </main>
  );
}
