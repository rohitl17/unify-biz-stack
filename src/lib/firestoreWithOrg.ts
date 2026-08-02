import { collection, addDoc, query, doc, QueryConstraint } from 'firebase/firestore';
import { db } from './firebase';

export async function addOrgDoc(col: string, data: object, orgId: string) {
  return addDoc(orgCollection(orgId, col), { ...data, orgId });
}

export function orgQuery(col: string, orgId: string, ...constraints: QueryConstraint[]) {
  return query(orgCollection(orgId, col), ...constraints);
}

export function orgCollection(orgId: string, col: string) {
  return collection(db, 'organizations', orgId, col);
}

export function orgDoc(orgId: string, col: string, id: string) {
  return doc(db, 'organizations', orgId, col, id);
}
