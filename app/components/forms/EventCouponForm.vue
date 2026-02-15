<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useForm } from "vee-validate";
import * as z from "zod";
import { format, isValid } from "date-fns";
import { Tag, Settings2, Info, Loader2, CheckCircle2 } from "lucide-vue-next";
import { toast } from "vue-sonner";

import PeriodSectionForm from "./PeriodSectionForm.vue";
import IsMaxNumberSectionForm from "./IsMaxNumberSectionForm.vue";
import TiptapEditor from "./TiptapEditor.vue";
import { couponFieldSchema } from "~~/app/utils/schemas/coupon";

const props = defineProps<{
  initialData?: any;
  couponId?: any;
}>();

// Simple bridge for Zod with Vee-Validate since @vee-validate/zod is missing
const toTypedSchema = (schema: z.ZodType<any>) => {
  return {
    async validate(values: any) {
      const result = await schema.safeParseAsync(values);
      if (result.success) {
        return {
          value: result.data,
          errors: {},
        };
      }

      // Transform Zod errors into vee-validate format
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue: any) => {
        const path = issue.path.join(".");
        errors[path] = issue.message;
      });

      return { errors };
    },
  };
};

const route = useRoute();
const router = useRouter();

let eventId = route.query.eventId as string;
let eventName = route.query.eventName as string;
let eventStartRaw = route.query.eventStart as string;
let eventStart = eventStartRaw ? new Date(eventStartRaw) : new Date();

let initialData = {
  eventId,
  isMaxNumber: false,
  maxQuota: 100,
  allowGenerateFrom: new Date(),
  allowGenerateUntil: new Date(),
  redeemFrom: new Date(),
  redeemUntil: new Date(),
  description: "",
  name: "",
  code: "",
};

if (props.initialData) {
  const event = props.initialData.event;
  eventId = event.id;
  eventName = event.title;
  eventStartRaw = event.startAt;
  eventStart = eventStartRaw ? new Date(eventStartRaw) : new Date();

  initialData.isMaxNumber = props.initialData.maxQuota ? true : false;
  initialData.maxQuota = props.initialData.maxQuota ?? 100;
  initialData.allowGenerateFrom = new Date(props.initialData.allowGenerateFrom);
  initialData.allowGenerateUntil = new Date(
    props.initialData.allowGenerateUntil,
  );
  initialData.redeemFrom = new Date(props.initialData.redeemFrom);
  initialData.redeemUntil = new Date(props.initialData.redeemUntil);
  initialData.description = props.initialData.description;
  initialData.name = props.initialData.name;
  initialData.code = props.initialData.code;
}

if (!eventId && !props.initialData) {
  router.push("/admin/coupons");
}

// Fetch existing coupons for suggestions
const { data: existingCouponsData } = await useFetch("/api/admin/coupons", {
  query: { eventId },
});
const existingCoupons = computed(
  () => (existingCouponsData.value as any)?.data || [],
);

const nameSuggestions = computed(() => {
  const names = existingCoupons.value.map((c: any) => c.name);
  return [...new Set(names)].slice(0, 5);
});

const codeSuggestions = computed(() => {
  const codes = existingCoupons.value.map((c: any) => c.code);
  return [...new Set(codes)].slice(0, 5);
});

// Use shared schema but refine it with client-side context (eventStart)
const formSchema = couponFieldSchema.superRefine((data, ctx) => {
  // Event Start Validation
  if (isValid(eventStart) && isValid(data.allowGenerateFrom)) {
    if (data.allowGenerateFrom < eventStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be after event start (${format(eventStart, "PPp")})`,
        path: ["allowGenerateFrom"],
      });
    }
  }

  // Generate Period Validation
  if (isValid(data.allowGenerateFrom) && isValid(data.allowGenerateUntil)) {
    if (data.allowGenerateUntil <= data.allowGenerateFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be after generation start",
        path: ["allowGenerateUntil"],
      });
    }
  }

  // Redeem Period Validation
  if (isValid(data.redeemFrom) && isValid(data.redeemUntil)) {
    if (data.redeemUntil <= data.redeemFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be after redemption start",
        path: ["redeemUntil"],
      });
    }
  }

  // Cross-Period Validation: Redeem Start >= Generate Start
  if (isValid(data.redeemFrom) && isValid(data.allowGenerateFrom)) {
    if (data.redeemFrom < data.allowGenerateFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be on or after generation start",
        path: ["redeemFrom"],
      });
    }
  }

  // Max Quota Validation
  if (data.isMaxNumber) {
    if (!data.maxQuota || data.maxQuota < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Max Quota must be at least 1",
        path: ["maxQuota"],
      });
    }
  }
});

const { values, errors, defineField, handleSubmit, setFieldValue } = useForm({
  validationSchema: toTypedSchema(formSchema),
  initialValues: initialData,
});

const [name, nameProps] = defineField("name");
const [code, codeProps] = defineField("code");
const [isMaxNumber] = defineField("isMaxNumber");
const [maxQuota] = defineField("maxQuota");
const [description] = defineField("description");

const isSubmitting = ref(false);

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true;
  try {
    const payload = {
      ...values,
      eventId,
      // Ensure maxQuota is null if not maxNumber
      maxQuota: values.isMaxNumber ? values.maxQuota : null,
    };

    if (props.couponId) {
      await $fetch(`/api/admin/coupons/${props.couponId}`, {
        method: "PUT",
        body: payload,
      });

      toast.success("Coupon updated successfully");
    } else {
      await $fetch("/api/admin/coupons", {
        method: "POST",
        body: payload,
      });

      toast.success("Coupon created successfully");
    }

    router.push("/admin/coupons");
  } catch (err: any) {
    console.error("Submit error:", err);
    if (err.statusCode === 409) {
      toast.error("Duplicate Code", {
        description: "A coupon with this code already exists for this event.",
      });
    } else {
      toast.error("Failed to create coupon", {
        description: err.statusMessage || "Please try again later.",
      });
    }
  } finally {
    isSubmitting.value = false;
  }
});
</script>

<template>
  <form @submit="onSubmit" class="space-y-8 max-w-4xl mx-auto pb-12">
    <Card class="bg-blue-50 border-blue-200 shadow-none">
      <CardHeader class="flex flex-row items-center gap-4 py-3">
        <Info class="h-5 w-5 text-blue-600 shrink-0" />
        <div class="space-y-1">
          <CardTitle
            v-if="!props.couponId"
            class="text-sm font-semibold text-blue-800"
            >Creating Coupon for {{ eventName }}</CardTitle
          >
          <CardTitle v-else class="text-sm font-semibold text-blue-800"
            >Editing Coupon for {{ eventName }}</CardTitle
          >
          <CardDescription class="text-xs text-blue-700">
            Event starts at {{ format(eventStart, "PPp") }}. Generation period
            must be after this date.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>

    <div class="grid gap-8">
      <!-- Basic Info -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Tag class="h-5 w-5 text-primary" />
            <CardTitle>Coupon Information</CardTitle>
          </div>
          <CardDescription
            >Berikan nama dan kode unik untuk kupon ini.</CardDescription
          >
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="name">Coupon Name</Label>
              <Input
                id="name"
                v-model="name"
                v-bind="nameProps"
                placeholder="misal: Early Bird"
              />
              <div
                v-if="nameSuggestions.length > 0"
                class="flex flex-wrap gap-1 mt-1"
              >
                <span class="text-xs text-slate-400 mr-1">Suggestions:</span>
                <Button
                  v-for="s in nameSuggestions"
                  :key="s"
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-6 px-2 text-[10px]"
                  @click="name = s"
                >
                  {{ s }}
                </Button>
              </div>
              <p v-if="errors.name" class="text-xs text-destructive">
                {{ errors.name }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="code">Coupon Code</Label>
              <Input
                id="code"
                v-model="code"
                v-bind="codeProps"
                placeholder="misal: EARLY2024"
                @input="code = code?.toUpperCase()"
              />
              <div
                v-if="codeSuggestions.length > 0"
                class="flex flex-wrap gap-1 mt-1"
              >
                <span class="text-xs text-slate-400 mr-1">Suggestions:</span>
                <Button
                  v-for="s in codeSuggestions"
                  :key="s"
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-6 px-2 text-[10px]"
                  @click="code = s"
                >
                  {{ s }}
                </Button>
              </div>
              <p v-if="errors.code" class="text-xs text-destructive">
                {{ errors.code }}
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <Label>Description</Label>
            <TiptapEditor v-model="description" />
          </div>
        </CardContent>
      </Card>

      <!-- Periods -->
      <div class="grid gap-6">
        <PeriodSectionForm
          type="Allow Generate"
          :start-at="values.allowGenerateFrom"
          :end-at="values.allowGenerateUntil"
          :start-period-limit="eventStart"
          @update:start-at="(v) => setFieldValue('allowGenerateFrom', v)"
          @update:end-at="(v) => setFieldValue('allowGenerateUntil', v)"
        />
        <div
          v-if="errors.allowGenerateFrom || errors.allowGenerateUntil"
          class="grid grid-cols-2 gap-4 -mt-4 px-4"
        >
          <p class="text-xs text-destructive">{{ errors.allowGenerateFrom }}</p>
          <p class="text-xs text-destructive">
            {{ errors.allowGenerateUntil }}
          </p>
        </div>

        <PeriodSectionForm
          type="Redemption"
          :start-at="values.redeemFrom"
          :end-at="values.redeemUntil"
          :start-period-limit="values.allowGenerateFrom"
          @update:start-at="(v) => setFieldValue('redeemFrom', v)"
          @update:end-at="(v) => setFieldValue('redeemUntil', v)"
        />
        <div
          v-if="errors.redeemFrom || errors.redeemUntil"
          class="grid grid-cols-2 gap-4 -mt-4 px-4"
        >
          <p class="text-xs text-destructive">{{ errors.redeemFrom }}</p>
          <p class="text-xs text-destructive">{{ errors.redeemUntil }}</p>
        </div>
      </div>

      <!-- Quota -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Settings2 class="h-5 w-5 text-primary" />
            <CardTitle>Pengaturan Kuota</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <IsMaxNumberSectionForm
            title="Batasi Jumlah Penggunaan"
            :is-max-number="values.isMaxNumber"
            :max-number="values.maxQuota"
            @update:is-max-number="(v) => setFieldValue('isMaxNumber', v)"
            @update:max-number="(v) => setFieldValue('maxQuota', v)"
          />
          <p v-if="errors.maxQuota" class="text-xs text-destructive mt-2">
            {{ errors.maxQuota }}
          </p>
        </CardContent>
      </Card>
    </div>

    <div class="flex justify-end pt-4">
      <Button
        type="submit"
        size="lg"
        class="min-w-[200px]"
        :disabled="isSubmitting"
      >
        <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
        <CheckCircle2 v-else class="mr-2 h-4 w-4" />
        {{ isSubmitting ? "Saving..." : "Save Coupon" }}
      </Button>
    </div>
  </form>
</template>
