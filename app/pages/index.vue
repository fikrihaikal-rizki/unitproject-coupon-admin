<script setup lang="ts">
import { toast } from "vue-sonner";
import { Loader2 } from "lucide-vue-next";

definePageMeta({
  layout: false,
});

const authStore = useAdminAuthStore();
const router = useRouter();

const form = reactive({
  email: "",
  password: "",
});

const isLoading = ref(false);

async function handleLogin() {
  if (!form.email || !form.password) {
    toast.error("Gagal", {
      description: "Email dan password harus diisi",
    });
    return;
  }

  isLoading.value = true;
  const result = await authStore.login(form);
  isLoading.value = false;

  if (result.success) {
    toast.success("Berhasil", {
      description: "Selamat datang kembali!",
    });
    const user: any = authStore.user
    if (user?.role === 'operator') {
      router.push('/operator/scan')
    }else{
      router.push("/admin");
    }
  } else {
    toast.error("Masalah Login", {
      description: result.message,
    });
  }
}
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950"
  >
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1
          class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          Admin Portal
        </h1>
        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Silakan masuk ke akun administrator Anda
        </p>
      </div>

      <Card class="border-zinc-200 shadow-sm dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Masukkan email dan password untuk melanjutkan
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              type="email"
              v-model="form.email"
              placeholder="admin@example.com"
              @keyup.enter="handleLogin"
            />
          </div>
          <div class="space-y-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              type="password"
              v-model="form.password"
              placeholder="••••••••"
              @keyup.enter="handleLogin"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button class="w-full" :disabled="isLoading" @click="handleLogin">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ isLoading ? "Memproses..." : "Masuk" }}
          </Button>
        </CardFooter>
      </Card>

      <p class="text-center text-xs text-zinc-500">
        &copy; {{ new Date().getFullYear() }} Unit Project Administrative System
      </p>
    </div>
  </div>
</template>
