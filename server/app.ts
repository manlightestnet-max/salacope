/** Every API route, registered once. `handle(Request) -> Response` serves them. */
import './routes/account.js';
import './routes/catalog.js';
import './routes/library.js';
import './routes/orders.js';
import './routes/chat.js';
import './routes/support.js';
import './routes/lightpay.js';
import './routes/admin.js';
import './routes/share.js';
import './routes/files.js';
import './routes/lockdown.js';
import './routes/disputes.js';

export { handle } from './http.js';
