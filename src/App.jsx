// src/App.jsx
import React, { useState } from 'react';

function App() {
  const [seriesName, setSeriesName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [recapResult, setRecapResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY;
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  // Function to search for TV series on OMDb
  const searchSeries = async () => {
    if (!seriesName.trim()) {
      setError("Please enter a TV series name.");
      setSearchResults([]);
      setSelectedSeries(null);
      setRecapResult('');
      return;
    }

    setIsLoading(true);
    setError('');
    setSearchResults([]);
    setSelectedSeries(null);
    setRecapResult('');

    try {
      const response = await fetch(
        `https://www.omdbapi.com/?s=${encodeURIComponent(seriesName)}&type=series&apikey=${OMDB_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`OMDb API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.Response === "True" && data.Search && data.Search.length > 0) {
        setSearchResults(data.Search);
      } else {
        setError(data.Error || `No TV series found for "${seriesName}".`);
      }
    } catch (err) {
      console.error("OMDb search error:", err);
      setError(`Failed to search TV series: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to select a series and fetch its details
  const selectSeries = async (seriesId) => {
    setIsLoading(true);
    setError('');
    setRecapResult('');

    try {
      const response = await fetch(
        `https://www.omdbapi.com/?i=${seriesId}&plot=full&apikey=${OMDB_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`OMDb API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.Response === "True") {
        setSelectedSeries(data);
        generateRecap(data); // Generate recap after selecting
      } else {
        setError(data.Error || `Failed to fetch details for series ID: ${seriesId}`);
      }
    } catch (err) {
      console.error("OMDb details error:", err);
      setError(`Failed to fetch series details: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Function to generate a recap using Gemini API
  const generateRecap = async (seriesData) => {
    setIsLoading(true);
    setError('');

    const seriesTitle = seriesData.Title;
    const seriesOverview = seriesData.Plot || "No overview available.";
    const seriesGenres = seriesData.Genre || "Unknown genres.";
    const seriesFirstAirDate = seriesData.Year || "Unknown date.";

    const prompt = `Generate a 3-sentence recap for the TV series "${seriesTitle}".
    The recap should be ${Math.random() > 0.5 ? 'funny and sarcastic' : 'emotional and reflective'}.
    Here's some information about the series:
    Overview: ${seriesOverview}
    Genres: ${seriesGenres}
    First Air Date: ${seriesFirstAirDate}

    Recap for "${seriesTitle}":`;

    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

      const geminiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await geminiResponse.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setRecapResult(text);
      } else {
        throw new Error("Failed to generate recap: No content from AI.");
      }
    } catch (err) {
      console.error("Gemini API error:", err);
      setError(`Failed to generate recap: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4">
      <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-8">
        TV Series Mood Recapper
      </h1>

      {/* Search Input */}
      <div className="flex w-full max-w-md mb-6 space-x-2">
        <input
          type="text"
          placeholder="Enter TV series name..."
          value={seriesName}
          onChange={(e) => setSeriesName(e.target.value)}
          onKeyPress={(e) => { if (e.key === 'Enter') searchSeries(); }}
          className="flex-grow p-3 text-lg bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
        />
        <button
          onClick={searchSeries}
          disabled={isLoading}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Loading and Error Messages */}
      {isLoading && <p className="text-blue-400 mb-4">Loading...</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Search Results */}
      {searchResults.length > 0 && !selectedSeries && (
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {searchResults.map((series) => (
            <div
              key={series.imdbID}
              className="bg-gray-800 rounded-lg shadow-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
              onClick={() => selectSeries(series.imdbID)}
            >
              {series.Poster && series.Poster !== 'N/A' ? (
                <img
                  src={series.Poster}
                  alt={series.Title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-700 flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-1">{series.Title}</h2>
                <p className="text-gray-400 text-sm">
                  {series.Year ? series.Year : 'N/A'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Series Details and Recap */}
      {selectedSeries && (
        <div className="w-full max-w-3xl bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          {selectedSeries.Poster && selectedSeries.Poster !== 'N/A' ? (
            <img
              src={selectedSeries.Poster}
              alt={selectedSeries.Title}
              className="w-48 h-auto rounded-lg shadow-md"
            />
          ) : (
            <div className="w-48 h-64 bg-gray-700 flex items-center justify-center text-gray-400 rounded-lg">
              No Image
            </div>
          )}
          <div className="flex-grow">
            <h2 className="text-3xl font-bold mb-2">{selectedSeries.Title}</h2>
            <p className="text-gray-400 text-sm mb-2">
              {selectedSeries.Year ? `First Aired: ${selectedSeries.Year}` : ''}
              {selectedSeries.Genre && ` | Genres: ${selectedSeries.Genre}`}
            </p>
            <p className="text-gray-300 mb-4">{selectedSeries.Plot}</p>

            {recapResult && (
              <div className="bg-gray-700 p-4 rounded-lg shadow-inner mt-4">
                <h3 className="text-xl font-semibold text-blue-300 mb-2">AI-Generated Recap:</h3>
                <p className="text-lg italic text-gray-200">"{recapResult}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
