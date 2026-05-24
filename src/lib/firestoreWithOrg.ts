import { collection, addDoc, query, where, QueryConstraint } from 'firebase/firestore';
import { db } from './firebase';

export async function addOrgDoc(col: string, data: object, orgId: string) {
  return addDoc(collection(db, col), { ...data, orgId });
}

export function orgQuery(col: string, orgId: string, ...constraints: QueryConstraint[]) {
  return query(collection(db, col), where('orgId', '==', orgId), ...constraints);
}
