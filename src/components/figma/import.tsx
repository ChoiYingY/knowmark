import React from 'react';

/**
 * RECALL AI CLEANED COMPONENTS
 */

const SidebarNavItem = ({ 
  icon, 
  label, 
  active = false 
}: { 
  icon: React.ReactNode, 
  label: string, 
  active?: boolean 
}) => (
  <div className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${active ? 'bg-[#59989B]/10' : 'hover:bg-slate-50'}`}>
    <div className={`w-5 h-5 flex items-center justify-center ${active ? 'text-[#59989B]' : 'text-slate-500'}`}>
      {icon}
    </div>
    <p className={`text-sm font-medium ${active ? 'text-[#59989B]' : 'text-slate-500'}`}>
      {label}
    </p>
  </div>
);

const ArticleCard = ({ 
  favicon, 
  title, 
  description, 
  timestamp 
}: { 
  favicon: string, 
  title: string, 
  description: string, 
  timestamp: string 
}) => (
  <div className="flex flex-col bg-white border border-slate-200 shadow-sm p-5 rounded-xl transition-all hover:shadow-md">
    <div className="flex justify-between items-start mb-3">
      <div className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg">
        <img src={favicon} alt="Source" className="w-5 h-5 object-contain" />
      </div>
      <button className="text-slate-400 hover:text-slate-600 transition-colors">
        <svg className="w-3.5 h-[18px]" viewBox="0 0 14 18" fill="currentColor">
          <path d="M0 18L0 2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0L12 0C12.55 0 13.0208 0.195833 13.4125 0.5875C13.8042 0.979167 14 1.45 14 2L14 18L7 15L0 18Z" />
        </svg>
      </button>
    </div>
    <h3 className="text-base font-bold text-slate-900 mb-1 leading-6">{title}</h3>
    <p className="text-sm text-slate-500 mb-4 leading-5">{description}</p>
    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
      <p className="text-xs text-slate-400">{timestamp}</p>
      <button className="flex items-center gap-1 group">
        <span className="text-xs font-semibold text-[#59989B]">Revisit</span>
        <svg className="w-2.5 h-2.5 text-[#59989B] group-hover:translate-x-0.5 transition-transform" viewBox="0 0 9 9" fill="currentColor">
          <path d="M7.10208 5.25L0 5.25L0 4.08333L7.10208 4.08333L3.83542 0.816667L4.66667 0L9.33333 4.66667L4.66667 9.33333L3.83542 8.51667L7.10208 5.25Z" />
        </svg>
      </button>
    </div>
  </div>
);

const TimelineItem = ({ 
  time, 
  status, 
  title, 
  summary, 
  tag, 
  tagColor 
}: any) => (
  <div className="flex gap-12 group relative">
    <div className="w-[140px] flex justify-end items-center pt-1 shrink-0">
      <div className="text-right">
        <p className={`text-[10px] font-bold tracking-wider uppercase ${status === 'Overdue' ? 'text-[#E57373]' : 'text-[#59989B]'}`}>
          {status}
        </p>
        <p className="text-[10px] text-slate-400">{time}</p>
      </div>
      <div className={`absolute left-[188px] w-2 h-2 rounded-full border-2 border-white z-10 ${status === 'Overdue' ? 'bg-[#E57373]' : 'bg-[#59989B]'}`} />
    </div>
    <div className="flex-1 bg-white border border-slate-200 shadow-sm p-4 rounded-xl mb-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h4 className="text-base font-bold text-slate-900 mb-1">{title}</h4>
          <p className="text-xs text-slate-500 leading-relaxed">{summary}</p>
          <div className="mt-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${tagColor}`}>
              {tag}
            </span>
          </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 rounded-md text-slate-400 hover:bg-slate-50">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 13 13">
              <path d="M6.66667 1.03333L6.66667 1.5C8.55556 1.72222 9.27778 2.19167 9.83333 2.90833C10.3889 3.625 10.6667 4.44444 10.6667 5.36667L10.6667 10.0333L12 10.0333L12 11.3667L1.33333 11.3667L1.33333 10.0333L2.66667 10.0333L2.66667 5.36667C2.66667 4.44444 2.94444 3.625 3.5 2.90833C4.05556 2.19167 4.77778 1.72222 5.66667 1.5L5.66667 1.03333C5.66667 0.755556 5.76389 0.519444 5.95833 0.325C6.15278 0.130556 6.38889 0.0333333 6.66667 0.0333333C6.94444 0.0333333 7.18056 0.130556 7.375 0.325C7.56944 0.519444 7.66667 0.755556 7.66667 1.03333Z" />
            </svg>
          </button>
          <button className="bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded text-[10px] font-medium text-slate-900 hover:bg-slate-50">
            Open
          </button>
        </div>
      </div>
    </div>
  </div>
);

const Sidebar = () => (
  <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col shrink-0">
    <div className="p-6">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-[#59989B] rounded flex items-center justify-center">
          <svg className="w-3 h-3 text-white" viewBox="0 0 12.8 12.8" fill="currentColor">
            <path d="M10.5 4.6L9.7 3L8.1 2.3L9.7 1.6L10.5 0L11.2 1.6L12.8 2.3L11.2 3L10.5 4.6Z M4.6 11L3.2 7.8L0 6.4L3.2 4.9L4.6 1.7L6.1 4.9L9.3 6.4L6.1 7.8L4.6 11Z" />
          </svg>
        </div>
        <h1 className="text-sm font-bold tracking-tight text-slate-900">RecallAI</h1>
      </div>
    </div>
    
    <nav className="flex-1 px-3 space-y-1 mt-2">
      <SidebarNavItem 
        label="Home" 
        icon={<svg className="w-4 h-4" viewBox="0 0 13 15" fill="currentColor"><path d="M1.6 13.3L4.1 13.3L4.1 8.3L9.1 8.3L9.1 13.3L11.6 13.3L11.6 5.8L6.6 2.1L1.6 5.8Z M0 15V5L6.6 0L13.3 5V15H7.5V10H5.8V15H0Z"/></svg>} 
      />
      <SidebarNavItem 
        label="Library" 
        active 
        icon={<svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M6.6 10H10V8.3H6.6V10Z M5 13.3C4.5 13.3 4.1 13.1 3.8 12.8C3.5 12.5 3.3 12.1 3.3 11.6V1.6C3.3 1.2 3.5 0.8 3.8 0.5C4.1 0.2 4.5 0 5 0H15C15.4 0 15.8 0.2 16.1 0.5C16.5 0.8 16.6 1.2 16.6 1.6V11.6C16.6 12.1 16.5 12.5 16.1 12.8C15.8 13.1 15.4 13.3 15 13.3L5 13.3Z M0 15C0 15.4 0.2 15.8 0.5 16.1C0.8 16.5 1.2 16.6 1.6 16.6H13.3V15H1.6V3.3H0V15Z"/></svg>}
      />
      <SidebarNavItem 
        label="Search" 
        icon={<svg className="w-4 h-4" viewBox="0 0 15 15" fill="currentColor"><path d="M13.8 15L8.5 9.7C8.1 10 7.6 10.3 7.1 10.5C6.6 10.7 6 10.8 5.4 10.8C3.9 10.8 2.6 10.3 1.5 9.2C0.5 8.2 0 6.9 0 5.4C0 3.9 0.5 2.6 1.5 1.5C2.6 0.5 3.9 0 5.4 0C6.9 0 8.2 0.5 9.2 1.5C10.3 2.6 10.8 3.9 10.8 5.4C10.8 6 10.7 6.6 10.5 7.1C10.3 7.6 10 8.1 9.7 8.5L15 13.8L13.8 15Z"/></svg>}
      />
    </nav>
    
    <div className="p-4 border-t border-slate-100 mt-auto">
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
          JD
        </div>
        <span className="text-sm font-medium text-slate-700">Profile</span>
      </div>
    </div>
  </aside>
);

const Page1Component = () => {
  return (
    <main className="bg-[#F6F7F8] min-h-screen font-sans text-slate-900">
      
      {/* SECTION 1: DASHBOARD VIEW */}
      <section className="flex min-h-screen">
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-end items-center">
            <button className="bg-[#59989B] text-white px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-sm hover:bg-[#4a8183] transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 10.5 10.5" fill="currentColor">
                <path d="M4.5 6L0 6L0 4.5L4.5 4.5L4.5 0L6 0L6 4.5L10.5 4.5L10.5 6L6 6L6 10.5L4.5 10.5L4.5 6Z" />
              </svg>
              Save New
            </button>
          </header>
          
          <div className="flex-1 px-20 py-8 overflow-auto">
            <div className="max-w-[1280px] mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
                <p className="text-sm text-slate-500">Welcome back to your knowledge base.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Latest Insight Card */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Latest Saved Insight</p>
                      <div className="bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] text-slate-500 font-medium shadow-sm">
                        Saved 2h ago
                      </div>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex gap-8">
                      <div className="w-1/3 aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden shadow-inner">
                        <img src="/image-002.png" alt="Feature" className="w-full h-full object-cover" />
                      </div>
                      <div className="w-2/3 flex flex-col">
                        <div className="flex gap-2 mb-4">
                          <span className="bg-[#59989B]/10 text-[#59989B] px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">Design</span>
                          <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">AI</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">The Future of AI Design</h3>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg flex gap-3 mb-6">
                          <svg className="w-3.5 h-3.5 text-[#59989B] shrink-0 mt-1" viewBox="0 0 12.8 12.8" fill="currentColor">
                            <path d="M10.5 4.6L9.7 3L8.1 2.3L9.7 1.6L10.5 0L11.2 1.6L12.8 2.3L11.2 3L10.5 4.6Z M4.6 11L3.2 7.8L0 6.4L3.2 4.9L4.6 1.7L6.1 4.9L9.3 6.4L6.1 7.8L4.6 11Z" />
                          </svg>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            How generative UI is shifting the paradigm from static components to intent-based systems. This article explores the transition towards interfaces that adapt in real-time to user needs.
                          </p>
                        </div>
                        <button className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium w-fit flex items-center gap-2 mt-auto hover:bg-slate-800 transition-colors">
                          View Full Analysis
                          <svg className="w-2.5 h-2.5" viewBox="0 0 9 9" fill="currentColor">
                            <path d="M7.10208 5.25L0 5.25L0 4.08333L7.10208 4.08333L3.83542 0.816667L4.66667 0L9.33333 4.66667L4.66667 9.33333L3.83542 8.51667L7.10208 5.25Z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Recent Saves Grid */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-800">Recent Saves</h3>
                      <button className="text-sm font-medium text-[#59989B] hover:underline">View All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ArticleCard 
                        favicon="/image-003.png"
                        title="The 10x Engineer Myth"
                        description="Why collaborative systems beat individual performance in modern software teams."
                        timestamp="Added yesterday"
                      />
                      <ArticleCard 
                        favicon="/image-004.png"
                        title="Daily Standup Refinement"
                        description="A new structure for our morning sync meetings to improve efficiency."
                        timestamp="Added 2 days ago"
                      />
                      <ArticleCard 
                        favicon="/image-005.png"
                        title="Deep Work Masterclass"
                        description="Techniques for intense focus in a distracted world. Lecture notes."
                        timestamp="Added 3 days ago"
                      />
                      <div className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-white transition-colors group">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 14 14">
                            <path d="M6 8H0V6H6V0H8V6H14V8H8V14H6V8Z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Add a new resource</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sidebar Cards Area */}
                <div className="space-y-8">
                  {/* Explore Themes */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-base font-bold text-slate-800">Explore Themes</h4>
                      <button className="text-slate-400 hover:text-slate-600"><svg className="w-4 h-4" viewBox="0 0 18 18" fill="currentColor"><path d="M8 18L8 12H10V14H18V16H10V18H8ZM0 16V14H6V16H0ZM4 12V10H0V8H4V6H6V12H4ZM8 10V8H18V10H8ZM12 6V0H14V2H18V4H14V6H12ZM0 4V2H10V4H0Z"/></svg></button>
                    </div>
                    <div className="p-2 space-y-1">
                      {/* Theme Items */}
                      {[
                        { icon: 'AI', label: 'AI & Tech', count: '124 items', bg: 'bg-[#59989B]/10', text: 'text-[#59989B]' },
                        { icon: 'Zap', label: 'Productivity', count: '86 items', bg: 'bg-green-100', text: 'text-green-700' },
                        { icon: 'Heart', label: 'Health', count: '42 items', bg: 'bg-red-100', text: 'text-red-600' },
                        { icon: 'Flame', label: 'Cooking', count: '29 items', bg: 'bg-orange-100', text: 'text-orange-600' },
                      ].map((theme, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme.bg}`}>
                              <span className={`text-[10px] font-bold ${theme.text}`}>{theme.icon}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{theme.label}</p>
                              <p className="text-[10px] text-slate-500">{theme.count}</p>
                            </div>
                          </div>
                          <svg className="w-1.5 h-2.5 text-slate-300 group-hover:translate-x-1 transition-transform" viewBox="0 0 4.3 7" fill="currentColor"><path d="M2.68 3.5L0 0.8L0.8 0L4.3 3.5L0.8 7L0 6.2L2.68 3.5Z"/></svg>
                        </div>
                      ))}
                    </div>
                    <button className="w-full py-4 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-[#59989B] hover:bg-slate-100 transition-colors">
                      View All Categories
                    </button>
                  </div>
                  
                  {/* Knowledge Growth Card */}
                  <div className="bg-slate-900 rounded-2xl p-6 relative overflow-hidden shadow-xl">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 blur-2xl rounded-full" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 blur-2xl rounded-full" />
                    <div className="relative z-10">
                      <h4 className="text-lg font-bold text-white mb-1">Knowledge Growth</h4>
                      <p className="text-xs text-slate-300 mb-6">You saved 12 new items this week.</p>
                      <div className="flex gap-6 pt-2">
                        <div>
                          <p className="text-2xl font-bold text-white">281</p>
                          <p className="text-[10px] text-slate-400 font-medium">Total Saved</p>
                        </div>
                        <div className="w-px h-10 bg-white/20" />
                        <div>
                          <p className="text-2xl font-bold text-white">94%</p>
                          <p className="text-[10px] text-slate-400 font-medium">Read Rate</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <footer className="mt-16 text-center">
                <p className="text-xs text-slate-400">© 2024 RecallAI. Your second brain.</p>
              </footer>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: READING QUEUE VIEW */}
      <section className="flex min-h-screen border-t border-slate-200 mt-20">
        <Sidebar />
        <div className="flex-1 bg-white flex flex-col">
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex justify-between items-center">
            <div className="w-8 h-8" />
            <button className="bg-[#59989B] text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-[#4a8183] transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 10.5 10.5" fill="currentColor">
                <path d="M4.5 6L0 6L0 4.5L4.5 4.5L4.5 0L6 0L6 4.5L10.5 4.5L10.5 6L6 6L6 10.5L4.5 10.5L4.5 6Z" />
              </svg>
              Add Item
            </button>
          </header>
          
          <div className="px-20 py-10 max-w-[1000px] mx-auto w-full">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800">Reading Queue</h2>
              <p className="text-xs text-slate-500">Manage your reading list and upcoming knowledge.</p>
            </div>
            
            <div className="flex gap-6 border-b border-slate-200 mb-8">
              <button className="pb-3 text-sm font-semibold text-slate-400">Library</button>
              <button className="pb-3 text-sm font-semibold text-[#59989B] border-b-2 border-[#59989B]">Reading Queue</button>
            </div>
            
            <div className="space-y-0 relative border-l border-slate-200 ml-[140px]">
              {/* Timeline Items */}
              <div className="pl-12 py-6 relative -left-[140px]">
                <h3 className="text-xl font-bold text-slate-800 mb-10 ml-[140px]">Today</h3>
                <div className="absolute left-[188px] top-[14px] w-2 h-2 bg-slate-400 rounded-full border-2 border-white z-10" />
                
                <TimelineItem 
                  status="Overdue"
                  time="March 18"
                  title="The 10x Engineer Myth"
                  summary="AI Summary: Explores why collaborative systems consistently outperform individual brilliance in modern software engineering teams."
                  tag="Career"
                  tagColor="bg-blue-50 text-blue-600"
                />
                
                <TimelineItem 
                  status="Read Today"
                  time="March 18"
                  title="Deep Work Masterclass Notes"
                  summary="AI Summary: Key techniques for maintaining intense focus in a distracted environment, emphasizing scheduling and ritual."
                  tag="Productivity"
                  tagColor="bg-purple-50 text-purple-600"
                />
              </div>

              <div className="pl-12 py-6 relative -left-[140px]">
                <h3 className="text-xl font-bold text-slate-800 mb-10 ml-[140px]">Upcoming</h3>
                <div className="absolute left-[188px] top-[14px] w-2 h-2 bg-slate-400 rounded-full border-2 border-white z-10" />
                
                <TimelineItem 
                  status="Tomorrow"
                  time="March 19"
                  title="The Future of AI Design"
                  summary="AI Summary: Analysis of generative UI shifts from static components to intent-based adaptive systems."
                  tag="AI"
                  tagColor="bg-indigo-50 text-indigo-600"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: EMPTY LIBRARY VIEW */}
      <section className="flex min-h-screen border-t border-slate-200 mt-20">
        <Sidebar />
        <div className="flex-1 bg-white flex flex-col items-center justify-center p-8">
          <div className="max-w-md w-full text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-8">
              <svg className="w-10 h-10 text-slate-300" viewBox="0 0 45 45" fill="currentColor">
                <path d="M5 45C3.6 45 2.4 44.5 1.5 43.5C0.5 42.6 0 41.4 0 40V5C0 3.6 0.5 2.4 1.5 1.5C2.4 0.5 3.6 0 5 0H40C41.4 0 42.6 0.5 43.5 1.5C44.5 2.4 45 3.6 45 5V40C45 41.4 44.5 42.6 43.5 43.5C42.6 44.5 41.4 45 40 45H5ZM5 40H40V32.5H32.5C31.2 34.1 29.8 35.3 28 36.2C26.3 37.1 24.5 37.5 22.5 37.5C20.5 37.5 18.7 37.1 17 36.2C15.2 35.3 13.8 34.1 12.5 32.5H5V40ZM22.5 32.5C24.1 32.5 25.5 32 26.8 31.1C28.1 30.2 29 29 29.5 27.5H40V5H5V27.5H15.5C16 29 16.9 30.2 18.2 31.1C19.5 32 20.9 32.5 22.5 32.5Z"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Your library is empty</h2>
            <p className="text-base text-slate-500 mb-10 leading-relaxed">
              Save articles, videos, or resources to build your personal knowledge base and remember why they matter.
            </p>
            <button className="bg-[#59989B] text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-[#59989B]/20 hover:scale-105 active:scale-95 transition-all">
              Add your first link
            </button>
          </div>
        </div>
      </section>

    </main>
  );
};

export default Page1Component;