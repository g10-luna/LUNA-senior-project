import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Clock, MapPin, LogOut, ArrowLeft, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { BookSearchResults } from "@/components/BookSearchResults";
import { User } from "@supabase/supabase-js";

interface BookRequest {
  id: string;
  title: string;
  author: string;
  status: "pending" | "in-transit" | "ready" | "completed";
  pickupLocation: string;
  requestedAt: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeRequests, setActiveRequests] = useState<BookRequest[]>([]);
  const [historyRequests, setHistoryRequests] = useState<BookRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showBrowseCatalog, setShowBrowseCatalog] = useState(false);
  const [selectedPickupRequest, setSelectedPickupRequest] = useState<BookRequest | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch active requests
  useEffect(() => {
    if (user) {
      fetchActiveRequests();

      const channel = supabase
        .channel('book-requests-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'book_requests'
          },
          () => {
            fetchActiveRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Auto-process simulation: advance request status after random delay
  useEffect(() => {
    const processRequest = async (requestId: string, currentStatus: string) => {
      let nextStatus: string | null = null;
      
      if (currentStatus === 'pending') {
        nextStatus = 'robot_navigating';
      } else if (currentStatus === 'in-transit' || currentStatus === 'robot_navigating') {
        nextStatus = 'ready';
      } else if (currentStatus === 'ready') {
        nextStatus = 'completed';
      }

      if (nextStatus) {
        const updateData: any = { status: nextStatus };
        if (nextStatus === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
        
        await supabase
          .from('book_requests')
          .update(updateData)
          .eq('id', requestId);
      }
    };

    const timeouts: NodeJS.Timeout[] = [];

    activeRequests.forEach((request) => {
      if (request.status !== 'completed' && request.status !== 'ready') {
        const delay = Math.random() * 30000 + 5000; // 5-35 seconds
        const timeout = setTimeout(() => {
          processRequest(request.id, request.status);
        }, delay);
        timeouts.push(timeout);
      } else if (request.status === 'ready') {
        const delay = Math.random() * 20000 + 10000; // 10-30 seconds
        const timeout = setTimeout(() => {
          processRequest(request.id, request.status);
        }, delay);
        timeouts.push(timeout);
      }
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [activeRequests]);

  const fetchActiveRequests = async () => {
    const { data, error } = await supabase
      .from('book_requests')
      .select(`
        *,
        books (title, author, shelf_location)
      `)
      .neq('status', 'completed')
      .order('requested_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setActiveRequests(
        data.map((req: any) => ({
          id: req.id,
          title: req.books.title,
          author: req.books.author,
          status: req.status === 'robot_navigating' ? 'in-transit' : req.status,
          pickupLocation: req.books.shelf_location,
          requestedAt: new Date(req.requested_at).toLocaleTimeString()
        }))
      );
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,isbn.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleBackToHome = () => {
    setSearchResults([]);
    setSearchQuery("");
    setShowHistory(false);
    setShowBrowseCatalog(false);
  };

  const handleMarkAsCollected = async () => {
    if (!selectedPickupRequest) return;
    
    try {
      await supabase
        .from('book_requests')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', selectedPickupRequest.id);
      
      setSelectedPickupRequest(null);
      fetchActiveRequests();
    } catch (error) {
      console.error('Error marking as collected:', error);
    }
  };

  const handleBrowseCatalog = async () => {
    setShowHistory(false);
    setShowBrowseCatalog(true);
    setIsSearching(true);
    setSearchQuery("");
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title')
        .limit(50);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Browse error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleShowHistory = async () => {
    setSearchResults([]);
    setSearchQuery("");
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('book_requests')
        .select(`
          *,
          books (title, author, shelf_location)
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setHistoryRequests(
          data.map((req: any) => ({
            id: req.id,
            title: req.books.title,
            author: req.books.author,
            status: 'completed' as any,
            pickupLocation: req.pickup_location || req.books.shelf_location,
            requestedAt: new Date(req.requested_at).toLocaleDateString()
          }))
        );
      }
      setShowHistory(true);
    } catch (error) {
      console.error('History error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning text-warning-foreground";
      case "in-transit":
        return "bg-primary text-primary-foreground";
      case "ready":
        return "bg-success text-success-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Processing";
      case "in-transit":
        return "LUNA is retrieving";
      case "ready":
        return "Ready for pickup";
      default:
        return status;
    }
  };

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BookOpen className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-6 py-8 pb-12 rounded-b-3xl shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8" />
              <h1 className="text-3xl font-bold">LUNA</h1>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-primary-foreground/90 text-sm">Welcome, {getUserName()}!</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 -mt-6">
        {/* Search Bar */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 h-12 text-base border-0 focus-visible:ring-0 bg-muted/50"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching}
                className="h-12 px-6"
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                {showBrowseCatalog ? "Browse Catalog" : "Search Results"}
              </h2>
              <Button variant="ghost" size="sm" onClick={handleBackToHome}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
            <BookSearchResults 
              books={searchResults}
              userName={getUserName()}
              onRequestSuccess={() => {
                handleBackToHome();
                fetchActiveRequests();
              }}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Button 
            variant="outline" 
            className="h-24 flex flex-col gap-2"
            onClick={handleBrowseCatalog}
            disabled={isSearching}
          >
            <BookOpen className="h-6 w-6" />
            <span className="text-sm font-medium">Browse Catalog</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-24 flex flex-col gap-2"
            onClick={handleShowHistory}
            disabled={isSearching}
          >
            <Clock className="h-6 w-6" />
            <span className="text-sm font-medium">My History</span>
          </Button>
        </div>

        {/* History Section */}
        {showHistory && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Request History</h2>
              <Button variant="ghost" size="sm" onClick={handleBackToHome}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
            {historyRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No completed requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {historyRequests.map((request) => (
                  <Card key={request.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{request.title}</p>
                          <p className="text-sm text-muted-foreground">{request.author}</p>
                        </div>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{request.requestedAt}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Requests */}
        {!showHistory && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Active Requests</h2>
          
          {activeRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No active requests</p>
                <p className="text-sm text-muted-foreground mt-1">Search for a book to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base mb-1">{request.title}</CardTitle>
                        <CardDescription className="text-sm">{request.author}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusText(request.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{request.pickupLocation}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{request.requestedAt}</span>
                      </div>
                    </div>
                    {request.status === "ready" && (
                      <Button 
                        className="w-full mt-4 bg-accent hover:bg-accent/90"
                        onClick={() => setSelectedPickupRequest(request)}
                      >
                        View Pickup Details
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="bg-primary/10 rounded-full p-3 h-fit">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-foreground">How LUNA Works</h3>
                <p className="text-sm text-muted-foreground">
                  Search for any book in our catalog and request it. LUNA will navigate to the shelf, 
                  and a librarian will place it in the robot's basket. You'll get notified when it's ready at the front desk!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pickup Details Dialog */}
      <Dialog open={!!selectedPickupRequest} onOpenChange={() => setSelectedPickupRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Pickup Details
            </DialogTitle>
            <DialogDescription>
              Your book is ready for pickup!
            </DialogDescription>
          </DialogHeader>
          {selectedPickupRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Book</p>
                  <p className="font-medium">{selectedPickupRequest.title}</p>
                  <p className="text-sm text-muted-foreground">{selectedPickupRequest.author}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Location</p>
                  </div>
                  <p className="font-medium">Front Desk</p>
                  <p className="text-xs text-muted-foreground">Main Library Entrance</p>
                </div>
                
                <div className="bg-primary/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Ready Since</p>
                  </div>
                  <p className="font-medium">{selectedPickupRequest.requestedAt}</p>
                  <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                <p className="text-sm font-medium text-accent-foreground">Pickup Hours</p>
                <p className="text-sm text-muted-foreground">Mon-Fri: 8:00 AM - 6:00 PM</p>
                <p className="text-sm text-muted-foreground">Sat: 9:00 AM - 4:00 PM</p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Please collect within 24 hours or the book will be returned to the shelf.
              </p>

              <Button 
                className="w-full" 
                onClick={handleMarkAsCollected}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Collected
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
