import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useSocket } from './SocketContext.jsx';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { token } = useAuth();
  const { subscribe } = useSocket();
  const [orgUnits, setOrgUnits] = useState([]);
  const [presentationCycles, setPresentationCycles] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgUnits = useCallback(async () => {
    const res = await api.get('/org-units');
    setOrgUnits(res.data);
    return res.data;
  }, []);

  const fetchPresentationCycles = useCallback(async () => {
    const res = await api.get('/presentation-cycles');
    setPresentationCycles(res.data);
    return res.data;
  }, []);

  const fetchLookups = useCallback(async () => {
    const [divRes, actRes] = await Promise.all([
      api.get('/lookups/divisions'),
      api.get('/lookups/activity-types'),
    ]);
    setDivisions(divRes.data);
    setActivityTypes(actRes.data);
    return { divisions: divRes.data, activityTypes: actRes.data };
  }, []);

  useEffect(() => {
    if (token) {
      Promise.all([fetchOrgUnits(), fetchPresentationCycles(), fetchLookups()])
        .finally(() => setLoading(false));
    } else {
      setOrgUnits([]);
      setPresentationCycles([]);
      setDivisions([]);
      setActivityTypes([]);
      setLoading(false);
    }
  }, [token, fetchOrgUnits, fetchPresentationCycles, fetchLookups]);

  // Refresh only the resource represented by the socket event. This keeps
  // unrelated pages from generating extra API requests.
  const refreshOrgUnits = useCallback(() => fetchOrgUnits().catch(() => {}), [fetchOrgUnits]);
  const refreshPresentationCycles = useCallback(
    () => fetchPresentationCycles().catch(() => {}),
    [fetchPresentationCycles]
  );
  const refreshLookups = useCallback(() => fetchLookups().catch(() => {}), [fetchLookups]);

  useEffect(() => {
    const unsubs = [
      subscribe('orgunits', refreshOrgUnits),
      subscribe('cycles', refreshPresentationCycles),
      subscribe('lookups', refreshLookups),
    ];
    return () => unsubs.forEach((u) => u());
  }, [subscribe, refreshOrgUnits, refreshPresentationCycles, refreshLookups]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchOrgUnits(), fetchPresentationCycles(), fetchLookups()]);
    } finally {
      setLoading(false);
    }
  }, [fetchOrgUnits, fetchPresentationCycles, fetchLookups]);

  const addOrgUnit = useCallback((unit) => {
    setOrgUnits((current) => [...current, unit]);
  }, []);

  const updateOrgUnit = useCallback((unit) => {
    setOrgUnits((current) => current.map((item) => (item._id === unit._id ? unit : item)));
  }, []);

  const removeOrgUnit = useCallback((unitId) => {
    setOrgUnits((current) => current.filter((item) => item._id !== unitId));
  }, []);

  const value = React.useMemo(() => ({
    orgUnits,
    presentationCycles,
    divisions,
    activityTypes,
    loading,
    refetch,
    refreshOrgUnits,
    refreshPresentationCycles,
    refreshLookups,
    addOrgUnit,
    updateOrgUnit,
    removeOrgUnit,
  }), [
    orgUnits,
    presentationCycles,
    divisions,
    activityTypes,
    loading,
    refetch,
    refreshOrgUnits,
    refreshPresentationCycles,
    refreshLookups,
    addOrgUnit,
    updateOrgUnit,
    removeOrgUnit,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppData = () => useContext(AppContext);