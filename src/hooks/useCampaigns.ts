'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCampaigns() {
  const { data, error, isLoading, mutate } = useSWR('/api/campaigns', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  const createCampaign = async (campaignData: any) => {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData),
    });
    if (!res.ok) throw new Error('Falha ao criar campanha');
    mutate();
    return res.json();
  };

  const joinCampaign = async (campaignId: string) => {
    const res = await fetch('/api/campaigns/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId }),
    });
    if (!res.ok) throw new Error('Falha ao participar da campanha');
    mutate();
    return res.json();
  };

  return {
    campaigns: data || [],
    isLoading,
    error,
    mutate,
    createCampaign,
    joinCampaign,
  };
}
