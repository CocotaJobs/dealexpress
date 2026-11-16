import { describe, it, expect } from 'vitest';
import { validateClientFields } from './validateClient';

const ok = { clientCompany: 'ACME', clientDocument: '12.345.678/0001-90', clientName: 'João', clientWhatsApp: '(11) 98765-4321' };

describe('validateClientFields', () => {
  it('accepts complete data', () => expect(validateClientFields(ok)).toBeNull());
  it('accepts CPF', () => expect(validateClientFields({ ...ok, clientDocument: '123.456.789-01' })).toBeNull());
  it('requires company', () => expect(validateClientFields({ ...ok, clientCompany: ' ' })).not.toBeNull());
  it('requires document', () => expect(validateClientFields({ ...ok, clientDocument: '' })).not.toBeNull());
  it('rejects incomplete document', () => expect(validateClientFields({ ...ok, clientDocument: '12.345' })).not.toBeNull());
  it('requires contact name', () => expect(validateClientFields({ ...ok, clientName: '' })).not.toBeNull());
  it('requires phone', () => expect(validateClientFields({ ...ok, clientWhatsApp: '' })).not.toBeNull());
  it('rejects short phone', () => expect(validateClientFields({ ...ok, clientWhatsApp: '9876' })).not.toBeNull());
});
