import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import ArticleForm from "@/components/customer/ArticleForm";
import { getValidPriceRule } from "@/components/utils/priceRuleUtils";

export default function ArticleList({ customerId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const queryClient = useQueryClient();

  const { data: articles = [] } = useQuery({
    queryKey: ['articles', customerId],
    queryFn: () => customerId ? base44.entities.Article.filter({ customer_id: customerId }) : [],
    enabled: !!customerId
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const nextNumber = articles.length + 1;
      const paddedNumber = String(nextNumber).padStart(3, '0');
      return base44.entities.Article.create({
        ...data,
        customer_id: customerId,
        article_number: `ART-${paddedNumber}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', customerId] });
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Article.update(editingArticle.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', customerId] });
      setEditingArticle(null);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (article) => base44.entities.Article.update(article.id, {
      status: article.status === 'Actief' ? 'Inactief' : 'Actief'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', customerId] });
    }
  });

  const getCurrentPrice = (article) => {
    const rule = getValidPriceRule(article.price_rules);
    return rule ? rule.price : null;
  };

  const getPriceStatus = (article) => {
    if (!article.price_rules || article.price_rules.length === 0) {
      return { status: 'no-price', label: 'Geen prijs ingesteld' };
    }
    
    const validRule = getValidPriceRule(article.price_rules);
    if (!validRule) {
      return { status: 'expired', label: 'Alle prijsregels verlopen' };
    }
    
    return { status: 'valid', label: 'Actief' };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Artikelen ({articles.length})</h3>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Artikel Toevoegen
        </Button>
      </div>

      {articles.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500">Nog geen artikelen toegevoegd</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...articles].sort((a, b) => {
            const numA = parseInt(a.article_number.replace('ART-', '')) || 0;
            const numB = parseInt(b.article_number.replace('ART-', '')) || 0;
            return numA - numB;
          }).map(article => {
            const currentPrice = getCurrentPrice(article);
            return (
              <Card key={article.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{article.article_number}</p>
                        <p className="text-sm text-slate-600">{article.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">
                        {currentPrice !== null ? `€ ${currentPrice.toFixed(2)}` : '-'}
                      </div>
                      <div className="text-xs text-slate-500">{article.unit}</div>
                    </div>

                    {(() => {
                      const priceStatus = getPriceStatus(article);
                      return (
                        <Badge 
                          variant={priceStatus.status === 'valid' ? 'default' : 'destructive'}
                          className={priceStatus.status === 'valid' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {priceStatus.label}
                        </Badge>
                      );
                    })()}

                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingArticle(article)}
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleStatusMutation.mutate(article)}
                        title={article.status === 'Actief' ? 'Deactiveren' : 'Activeren'}
                      >
                        {article.status === 'Actief' ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Nieuw/Bewerk Dialog */}
      <Dialog open={showForm || !!editingArticle} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingArticle(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingArticle ? 'Artikel Bewerken' : 'Artikel Toevoegen'}</DialogTitle>
          </DialogHeader>
          <ArticleForm
            article={editingArticle}
            onSave={(data) => {
              if (editingArticle) {
                updateMutation.mutate(data);
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingArticle(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}