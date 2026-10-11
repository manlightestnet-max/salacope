import React from 'react';
import { useParams } from 'react-router-dom';
import { SellerScreen } from '@/features/admin';

/** `/admin/vendeurs/:id` */
export const AdminSellerPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  return <SellerScreen key={id} id={id} />;
};
