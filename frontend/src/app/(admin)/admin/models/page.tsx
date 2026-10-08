"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/api/admin";
import { chatApi } from "@/api/chat";
import { formatRub } from "@/lib/utils";
import type { AiModelAdmin } from "@/types";

function errorText(e: unknown, fallback: string) {
  return (e as AxiosError<{ detail?: string }>).response?.data?.detail ?? fallback;
}

function ModelRow({ model, markup }: { model: AiModelAdmin; markup: number }) {
  const qc = useQueryClient();
  const [inPrice, setInPrice] = useState(model.input_price);
  const [outPrice, setOutPrice] = useState(model.output_price);

  useEffect(() => {
    setInPrice(model.input_price);
    setOutPrice(model.output_price);
  }, [model.input_price, model.output_price]);

  const update = useMutation({
    mutationFn: (data: Partial<AiModelAdmin>) => adminApi.updateAiModel(model.id, data),
    onSuccess: () => {
      toast.success("Сохранено");
      qc.invalidateQueries({ queryKey: ["admin-ai-models"] });
      qc.invalidateQueries({ queryKey: ["chat-config"] });
    },
    onError: (e) => toast.error(errorText(e, "Не удалось сохранить")),
  });

  const changed =
    parseFloat(inPrice) !== parseFloat(model.input_price) ||
    parseFloat(outPrice) !== parseFloat(model.output_price);
  const k = 1 + markup / 100;

  return (
    <tr className="border-b align-top last:border-0">
      <td className="px-4 py-3">
        <div className="font-medium">{model.name}</div>
        <div className="font-mono text-xs text-muted-foreground">{model.id}</div>
      </td>
      <td className="px-4 py-3">
        <Input value={inPrice} onChange={(e) => setInPrice(e.target.value)} className="h-9 w-28" inputMode="decimal" />
        <div className="mt-1 text-xs text-muted-foreground">клиенту {formatRub(parseFloat(inPrice || "0") * k)}</div>
      </td>
      <td className="px-4 py-3">
        <Input value={outPrice} onChange={(e) => setOutPrice(e.target.value)} className="h-9 w-28" inputMode="decimal" />
        <div className="mt-1 text-xs text-muted-foreground">клиенту {formatRub(parseFloat(outPrice || "0") * k)}</div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={model.is_active ? "success" : "secondary"}>{model.is_active ? "Включена" : "Скрыта"}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          {changed && (
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={() => update.mutate({ input_price: inPrice, output_price: outPrice })}
            >
              Сохранить
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={update.isPending}
            onClick={() => update.mutate({ is_active: !model.is_active })}
          >
            {model.is_active ? "Скрыть" : "Включить"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminModelsPage() {
  const qc = useQueryClient();
  const { data: models, isLoading } = useQuery({
    queryKey: ["admin-ai-models"],
    queryFn: () => adminApi.listAiModels(),
  });
  const { data: config } = useQuery({ queryKey: ["chat-config"], queryFn: () => chatApi.config() });
  const markup = config ? parseFloat(config.markup_percent) : 25;

  const [form, setForm] = useState({ id: "", name: "", description: "", input_price: "", output_price: "" });
  const create = useMutation({
    mutationFn: () => adminApi.createAiModel({ ...form, is_active: true }),
    onSuccess: () => {
      toast.success("Модель добавлена");
      setForm({ id: "", name: "", description: "", input_price: "", output_price: "" });
      qc.invalidateQueries({ queryKey: ["admin-ai-models"] });
      qc.invalidateQueries({ queryKey: ["chat-config"] });
    },
    onError: (e) => toast.error(errorText(e, "Не удалось добавить")),
  });

  return (
    <>
      <div>
        <h1 className="font-display text-[28px] leading-tight sm:text-[32px]">Модели ИИ</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Себестоимость в Timeweb AI Gateway, ₽ за 1 млн токенов. Клиент платит её плюс наценку {markup}%.
          Актуальные цены — в панели Timeweb, раздел «AI Gateway».
        </p>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Загрузка...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3">Модель</th>
                  <th className="px-4 py-3">Вход (вопрос)</th>
                  <th className="px-4 py-3">Выход (ответ)</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {models?.map((m) => <ModelRow key={m.id} model={m} markup={markup} />)}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Добавить модель</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="ID в шлюзе, например openai/gpt-5.4"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value.trim() })}
            />
            <Input placeholder="Название" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input
              placeholder="Короткое описание"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="md:col-span-2"
            />
            <Input
              placeholder="Цена входа, ₽ за 1 млн"
              inputMode="decimal"
              value={form.input_price}
              onChange={(e) => setForm({ ...form, input_price: e.target.value })}
            />
            <Input
              placeholder="Цена выхода, ₽ за 1 млн"
              inputMode="decimal"
              value={form.output_price}
              onChange={(e) => setForm({ ...form, output_price: e.target.value })}
            />
          </div>
          <Button
            className="mt-4"
            disabled={!form.id || !form.name || !form.input_price || !form.output_price || create.isPending}
            onClick={() => create.mutate()}
          >
            Добавить
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
