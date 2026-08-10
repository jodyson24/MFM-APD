import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { token } = useAuth();
  const [orgUnits, setOrgUnits] = useState([]);
  const [presentationCycles, setPresentationCycles] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgUnits = async () => {
    const res = await api.get('/org-units');
    setOrgUnits(res.data);
  };

  const fetchPresentationCycles = async () => {
    const res = await api.get('/presentation-cycles');
    setPresentationCycles(res.data);
  };

  const fetchLookups = async () => {
    const [divRes, actRes] = await Promise.all([
      api.get('/lookups/divisions'),
      api.get('/lookups/activity-types'),
    ]);
    setDivisions(divRes.data);
    setActivityTypes(actRes.data);
  };

  useEffect(() => {
    if (token) {
      Promise.all([fetchOrgUnits(), fetchPresentationCycles(), fetchLookups()])
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const value = {
    orgUnits,
    presentationCycles,
    divisions,
    activityTypes,
    loading,
    refetch: () => {
      setLoading(true);
      Promise.all([fetchOrgUnits(), fetchPresentationCycles(), fetchLookups()])
        .finally(() => setLoading(false));
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppData = () => useContext(AppContext);