"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { customerSchema, type CustomerFormData } from "@/validators/customer";
import { createCustomer, updateCustomer } from "@/actions/customers";
import { getCustomCities } from "@/actions/master-lists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { COUNTRIES } from "@/lib/countries";
import type { Customer } from "@/types";

interface CustomerFormProps {
  customer?: Customer;
  onSuccess?: (customer: Customer) => void;
  onCancel?: () => void;
}

export function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const isEditing = !!customer;
  const [customCities, setCustomCities] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState(customer?.country ?? "");
  const [citySearch, setCitySearch] = useState(customer?.city ?? "");

  const {
    register, handleSubmit, watch, setValue, control,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema) as any, // eslint-disable-line
    defaultValues: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
      area: customer?.area ?? "",
      city: customer?.city ?? "",
      country: customer?.country ?? "",
      countryCustom: customer?.countryCustom ?? "",
      gender: customer?.gender ?? "MALE",
      dateOfBirth: customer?.dateOfBirth ?? "",
      notes: customer?.notes ?? "",
      tags: customer?.tags ?? [],
      isVIP: customer?.isVIP ?? false,
    },
  });

  const isVIP = watch("isVIP");
  const selectedCountry = watch("country");

  // Load saved custom cities when country changes
  useEffect(() => {
    const country = selectedCountry === "Others" ? watch("countryCustom") : selectedCountry;
    if (!country) { setCustomCities([]); return; }
    getCustomCities(country).then(setCustomCities).catch(() => {});
  }, [selectedCountry]); // eslint-disable-line

  const filteredCountries = countrySearch
    ? COUNTRIES.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES;

  const onSubmit = async (data: CustomerFormData) => {
    // If "Others" country is selected, use countryCustom as the effective country
    const payload: CustomerFormData = { ...data };
    if (data.country === "Others" && data.countryCustom) {
      payload.country = data.countryCustom;
    }

    const result = isEditing ? await updateCustomer(customer.id, payload) : await createCustomer(payload);
    if (result.success) {
      toast.success(result.message ?? "Success");
      onSuccess?.(result.data as Customer);
    } else { toast.error(result.error ?? "Something went wrong"); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name *</Label>
          <Input id="name" placeholder="John Smith" {...register("name")} className={errors.name ? "border-destructive" : ""} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input id="phone" placeholder="+971 50 123 4567" {...register("phone")} className={errors.phone ? "border-destructive" : ""} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" placeholder="john@example.com" {...register("email")} className={errors.email ? "border-destructive" : ""} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select defaultValue={customer?.gender ?? "MALE"} onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE" | "OTHER")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">Address Information</h4>

        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input id="address" placeholder="Street address..." {...register("address")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="area">Area</Label>
          <Input id="area" placeholder="e.g. Business Bay, Jumeirah" {...register("area")} />
        </div>

        {/* Country — searchable */}
        <div className="space-y-1.5">
          <Label>Country</Label>
          <Controller name="country" control={control} render={() => (
            <div>
              <Input
                list="country-list"
                placeholder="Search country..."
                value={countrySearch}
                onChange={(e) => {
                  setCountrySearch(e.target.value);
                  // Check if the typed value exactly matches a country or "Others"
                  const match = COUNTRIES.find((c) => c.toLowerCase() === e.target.value.toLowerCase());
                  if (match) { setValue("country", match); }
                  else if (e.target.value.toLowerCase() === "others") { setValue("country", "Others"); }
                  else { setValue("country", e.target.value); }
                }}
              />
              <datalist id="country-list">
                {filteredCountries.slice(0, 50).map((c) => (<option key={c} value={c} />))}
                <option value="Others" />
              </datalist>
            </div>
          )} />
          {selectedCountry === "Others" && (
            <div className="mt-2 space-y-1">
              <Label htmlFor="countryCustom" className="text-xs text-muted-foreground">Enter Country Name</Label>
              <Input id="countryCustom" placeholder="Country name..." {...register("countryCustom")} className="h-8 text-sm" />
            </div>
          )}
        </div>

        {/* City — searchable with autocomplete */}
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            list="city-list"
            placeholder="City name..."
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              setValue("city", e.target.value);
            }}
          />
          <datalist id="city-list">
            {customCities.map((c) => (<option key={c} value={c} />))}
          </datalist>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Customer preferences, style notes, special requirements..." rows={3} {...register("notes")} />
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20">
        <Switch id="isVIP" checked={isVIP} onCheckedChange={(v) => setValue("isVIP", v)} />
        <div>
          <Label htmlFor="isVIP" className="text-sm font-medium cursor-pointer">VIP Customer</Label>
          <p className="text-xs text-muted-foreground">Mark this customer as VIP for priority service</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (<Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>)}
        <Button type="submit" variant="gold" loading={isSubmitting} className="flex-1">
          {isEditing ? "Update Customer" : "Create Customer"}
        </Button>
      </div>
    </form>
  );
}
